import { supabaseTable } from '../lib/supabase.js';
import { addLeadEmailHistory } from '../lib/crm.js';

function bodyOf(req){if(typeof req.body==='string'){try{return JSON.parse(req.body)}catch{return Object.fromEntries(new URLSearchParams(req.body))}}return req.body||{}}
function safeEqual(a,b){const x=String(a||'');const y=String(b||'');if(!x||x.length!==y.length)return false;let diff=0;for(let i=0;i<x.length;i++)diff|=x.charCodeAt(i)^y.charCodeAt(i);return diff===0}
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
 if(!safeEqual(req.headers['x-gift-secret'],process.env.GIFT_AUTOMATION_SECRET))return res.status(401).json({ok:false,error:'Unauthorized'});
 const body=bodyOf(req);
 try{
  if(body.action==='claim'){
   const due=await supabaseTable('lead_email_outbox?sequence_key=eq.gift_short_programs&status=eq.queued&send_after=lte.'+encodeURIComponent(new Date().toISOString())+'&select=id,lead_id,step,subject,body,cta&order=send_after.asc&limit=20');
   const messages=[];
   for(const row of due||[]){
    const leads=await supabaseTable('leads?id=eq.'+encodeURIComponent(row.lead_id)+'&select=id,email,name,email_consent,status&limit=1');
    const lead=leads?.[0];
    if(!lead||!lead.email_consent||!lead.email||['booked','won','not_fit'].includes(lead.status)){
      await supabaseTable('lead_email_outbox?id=eq.'+encodeURIComponent(row.id)+'&status=eq.queued',{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'stopped',blocked_reason:'Lead đã dừng hoặc không còn consent.',updated_at:new Date().toISOString()})});
      continue;
    }
    const claimed=await supabaseTable('lead_email_outbox?id=eq.'+encodeURIComponent(row.id)+'&status=eq.queued',{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'sending',updated_at:new Date().toISOString()})});
    if(claimed?.[0])messages.push({id:row.id,leadId:row.lead_id,to:lead.email,name:lead.name,subject:row.subject,body:row.body,cta:row.cta});
   }
   return res.status(200).json({ok:true,messages});
  }
  if(body.action==='ack'){
   const id=String(body.id||'');
   const rows=await supabaseTable('lead_email_outbox?id=eq.'+encodeURIComponent(id)+'&sequence_key=eq.gift_short_programs&status=eq.sending&select=id,lead_id,subject&limit=1');
   const row=rows?.[0];if(!row)return res.status(404).json({ok:false,error:'Message not found'});
   if(body.outcome==='sent'){
    const sentAt=new Date().toISOString();
    await supabaseTable('lead_email_outbox?id=eq.'+encodeURIComponent(id)+'&status=eq.sending',{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'sent',sent_at:sentAt,last_error:null,updated_at:sentAt})});
    await addLeadEmailHistory(row.lead_id,{subject:row.subject,note:'Email quà tặng/nuôi dưỡng được Apps Script xác nhận đã gửi.',sentAt});
    return res.status(200).json({ok:true});
   }
   const error=String(body.error||'Gmail không xác nhận gửi.').slice(0,500);
   await supabaseTable('lead_email_outbox?id=eq.'+encodeURIComponent(id)+'&status=eq.sending',{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'failed',last_error:error,updated_at:new Date().toISOString()})});
   return res.status(200).json({ok:true});
  }
  return res.status(400).json({ok:false,error:'Unknown action'});
 }catch(error){return res.status(500).json({ok:false,error:'Could not process nurture message'});}
}

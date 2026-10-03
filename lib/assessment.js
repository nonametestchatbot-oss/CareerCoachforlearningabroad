export const DIMENSIONS = {
  I: {
    key: 'I',
    left: 'Độc lập',
    right: 'Liên kết / phụ thuộc lẫn nhau',
    theme: 'Bạn giữ bản sắc riêng và phối hợp với người khác như thế nào?',
    leftDetail: 'Bạn thường bắt đầu từ suy nghĩ, lựa chọn và mục tiêu của chính mình; khi đã rõ hướng, bạn có thể tự chủ động hành động.',
    rightDetail: 'Bạn thường nhìn mình trong mối liên hệ với gia đình, nhóm và cộng đồng; sự đồng thuận và cảm giác cùng thuộc về giúp bạn phối hợp tốt hơn.',
    context: 'Khi học tập hoặc sống ở môi trường mới, hãy để ý lúc nào bạn cần tự quyết và lúc nào việc hỏi ý kiến, kết nối với nhóm sẽ giúp mình đi xa hơn.'
  },
  S: {
    key: 'S',
    left: 'Bình đẳng',
    right: 'Địa vị',
    theme: 'Bạn nhìn vai trò, quyền lực và thứ bậc trong nhóm như thế nào?',
    leftDetail: 'Bạn có xu hướng xem trọng trao đổi hai chiều, vai trò linh hoạt và khả năng đóng góp của từng người hơn là chức danh.',
    rightDetail: 'Bạn có xu hướng để ý kinh nghiệm, vai trò và trật tự trong nhóm; biết ai có trách nhiệm quyết định giúp bạn cảm thấy an toàn và rõ ràng hơn.',
    context: 'Trong lớp học, gia đình hoặc nơi làm việc, hãy quan sát cách mọi người ra quyết định và chọn cách lên tiếng phù hợp với vai trò của mình.'
  },
  R: {
    key: 'R',
    left: 'Rủi ro',
    right: 'Chắc chắn',
    theme: 'Bạn hành động khi chưa có đủ thông tin như thế nào?',
    leftDetail: 'Bạn thường sẵn sàng thử nhanh, điều chỉnh trong quá trình làm và xem sai sót nhỏ là một phần của việc học.',
    rightDetail: 'Bạn thường muốn tìm hiểu nền tảng, làm rõ quy trình và chuẩn bị kỹ hơn trước khi bắt đầu để giảm bất ngờ không cần thiết.',
    context: 'Khi chọn ngành, quốc gia hoặc kế hoạch học tập, hãy cân bằng giữa một bước thử nhỏ và lượng thông tin đủ để bạn thấy yên tâm.'
  },
  D: {
    key: 'D',
    left: 'Trực tiếp',
    right: 'Gián tiếp',
    theme: 'Bạn đưa yêu cầu, phản hồi và thông tin quan trọng theo cách nào?',
    leftDetail: 'Bạn thường đi thẳng vào ý chính, hỏi rõ và nói điều mình cần một cách minh bạch; sự rõ ràng giúp bạn tiết kiệm thời gian.',
    rightDetail: 'Bạn thường đặt ý chính trong bối cảnh, chú ý sắc thái và chọn thời điểm phù hợp để bảo vệ mối quan hệ khi trao đổi điều nhạy cảm.',
    context: 'Ở môi trường đa văn hóa, hãy kiểm tra xem người nghe cần câu trả lời ngắn gọn hay cần thêm bối cảnh trước khi đi đến kết luận.'
  },
  T: {
    key: 'T',
    left: 'Nhiệm vụ',
    right: 'Quan hệ',
    theme: 'Bạn xây dựng sự tin cậy khi bắt đầu một việc mới như thế nào?',
    leftDetail: 'Bạn thường tạo niềm tin bằng tiến độ, kết quả và việc hoàn thành điều đã thống nhất; mục tiêu rõ giúp bạn bắt nhịp nhanh.',
    rightDetail: 'Bạn thường đầu tư thời gian tìm hiểu con người, bối cảnh và mối quan hệ trước; nền tảng tin cậy giúp công việc bền vững hơn.',
    context: 'Khi du học hoặc tham gia nhóm mới, hãy dành chỗ cho cả hai: hoàn thành một việc cụ thể và chủ động xây dựng kết nối.'
  }
};

export const QUESTIONS = [
  ['Q01','I',-1,'Tôi thấy thoải mái khi tự quyết định cách làm mà không cần chờ nhóm đồng ý.'],
  ['Q02','I',-1,'Khi chọn một hướng đi, tôi thường ưu tiên điều phù hợp với mục tiêu cá nhân của mình.'],
  ['Q03','I',1,'Tôi thường cân nhắc tác động của lựa chọn lên gia đình hoặc nhóm trước khi quyết định.'],
  ['Q04','I',1,'Tôi làm việc tốt hơn khi cảm thấy mình đang cùng thuộc về một nhóm.'],
  ['Q05','I',1,'Tôi chủ động giữ liên lạc và phối hợp để mọi người cùng tiến bộ.'],
  ['Q06','I',-1,'Tôi thường muốn tự xử lý khó khăn trước khi nhờ người khác hỗ trợ.'],
  ['Q07','I',1,'Ý kiến của những người quan trọng với tôi có ảnh hưởng rõ đến lựa chọn của tôi.'],
  ['Q08','T',1,'Tôi muốn xây dựng sự thân thuộc với mọi người trước khi bắt đầu việc quan trọng.'],
  ['Q09','T',-1,'Khi có mục tiêu, tôi thích bắt tay vào việc trước rồi làm quen dần với mọi người.'],
  ['Q10','T',-1,'Tôi xem việc hoàn thành đúng cam kết là cách thuyết phục nhất để tạo niềm tin.'],
  ['Q11','T',1,'Một mối quan hệ tốt thường giúp tôi làm việc hiệu quả hơn về lâu dài.'],
  ['Q12','T',-1,'Trong dự án mới, tôi thường muốn chốt nhiệm vụ và thời hạn ngay từ đầu.'],
  ['Q13','T',-1,'Tôi ưu tiên kết quả cụ thể hơn việc duy trì một cuộc trò chuyện dài.'],
  ['Q14','T',1,'Tôi muốn hiểu cách mọi người suy nghĩ trước khi thống nhất cách làm việc.'],
  ['Q15','T',1,'Tôi có thể linh hoạt thời gian để giữ gìn một mối quan hệ quan trọng.'],
  ['Q16','R',-1,'Tôi sẵn sàng thử một cách mới nếu bước thử đó giúp tôi học nhanh hơn.'],
  ['Q17','R',-1,'Tôi có thể bắt đầu dù chưa biết chắc mọi việc sẽ diễn ra thế nào.'],
  ['Q18','R',1,'Tôi thường tìm hiểu khá kỹ trước khi cam kết với một lựa chọn lớn.'],
  ['Q19','R',-1,'Nếu có thể sửa trong quá trình làm, tôi không muốn chờ quá lâu để bắt đầu.'],
  ['Q20','R',-1,'Tôi xem một sai sót nhỏ là dữ liệu để điều chỉnh, không nhất thiết là thất bại.'],
  ['Q21','R',1,'Tôi muốn biết rõ tiêu chuẩn và quy trình trước khi bắt tay vào việc.'],
  ['Q22','R',1,'Tôi cảm thấy yên tâm hơn khi đã chuẩn bị các phương án cho tình huống bất ngờ.'],
  ['Q23','S',-1,'Tôi thấy thoải mái khi đặt câu hỏi hoặc phản biện với người có vị trí cao hơn.'],
  ['Q24','S',1,'Tôi thường chờ người có trách nhiệm chính đưa ra định hướng trước.'],
  ['Q25','S',-1,'Trong nhóm, tôi nghĩ mọi người nên có cơ hội lên tiếng tương đối như nhau.'],
  ['Q26','S',1,'Tôi chú ý đến vai trò và kinh nghiệm của từng người khi quyết định cách trao đổi.'],
  ['Q27','S',1,'Tôi thấy rõ ràng hơn khi biết ai là người có quyền quyết định cuối cùng.'],
  ['Q28','S',1,'Tôi điều chỉnh cách xưng hô hoặc hành vi tùy theo vai trò của người đối diện.'],
  ['Q29','S',-1,'Tôi thường gọi thẳng vấn đề với người phụ trách nếu tôi thấy có điểm chưa hợp lý.'],
  ['Q30','S',1,'Tôi cho rằng trật tự trong nhóm giúp mọi người biết trách nhiệm của mình.'],
  ['Q31','S',-1,'Một chức danh không làm cho ý kiến của ai đó tự động đúng hơn.'],
  ['Q32','S',1,'Tôi thường quan sát thứ bậc trước khi chọn cách trình bày một đề xuất.'],
  ['Q33','S',-1,'Tôi thích môi trường cho phép mọi người trao đổi khá bình đẳng.'],
  ['Q34','D',-1,'Khi có yêu cầu, tôi thường nói thẳng điều mình cần.'],
  ['Q35','D',-1,'Tôi thấy phản hồi rõ ràng, ngay lúc cần, giúp mình tiến bộ nhanh hơn.'],
  ['Q36','D',1,'Tôi thường bắt đầu bằng việc giải thích bối cảnh trước khi đi vào ý chính.'],
  ['Q37','D',-1,'Tôi thấy thoải mái khi nói “không” nếu một đề nghị không phù hợp.'],
  ['Q38','D',1,'Với vấn đề nhạy cảm, tôi thường chọn cách nói giảm và chọn thời điểm riêng tư.'],
  ['Q39','D',1,'Tôi chú ý nhiều đến sắc thái và điều chưa được nói ra trong một cuộc trò chuyện.'],
  ['Q40','D',1,'Tôi có thể thay đổi cách diễn đạt để giữ cho mối quan hệ không bị căng thẳng.']
].map(([id, axis, direction, text]) => ({ id, axis, direction, text }));

export function calculateResults(answers) {
  if (!answers || typeof answers !== 'object') throw new Error('Answers are required');
  const totals = Object.fromEntries(Object.keys(DIMENSIONS).map(key => [key, { total: 0, count: 0 }]));
  for (const question of QUESTIONS) {
    const answer = Number(answers[question.id]);
    if (!Number.isInteger(answer) || answer < 1 || answer > 7) throw new Error(`Invalid answer: ${question.id}`);
    totals[question.axis].total += (answer - 4) * question.direction;
    totals[question.axis].count += 1;
  }
  return Object.values(DIMENSIONS).map(dimension => {
    const { total, count } = totals[dimension.key];
    const score = 50 + (total / (count * 3)) * 50;
    const position = Math.max(0, Math.min(100, score));
    let level;
    if (position >= 45 && position <= 55) level = 'middle';
    else if (position < 45 && position >= 30) level = 'moderate-left';
    else if (position > 55 && position <= 70) level = 'moderate-right';
    else if (position < 30) level = 'strong-left';
    else level = 'strong-right';
    const side = level.endsWith('left') ? 'left' : level.endsWith('right') ? 'right' : null;
    const phrase = level === 'middle'
      ? `Bạn ở giữa hai xu hướng: ${dimension.left} và ${dimension.right}.`
      : `Bạn có xu hướng ${level.startsWith('strong') ? 'mạnh' : 'trung bình'} về ${side === 'left' ? dimension.left : dimension.right}.`;
    const detail = level === 'middle'
      ? `Bạn có thể chuyển đổi giữa ${dimension.left.toLowerCase()} và ${dimension.right.toLowerCase()} tùy bối cảnh. Đây là một vị trí linh hoạt, không phải một kết luận tốt hay xấu.`
      : side === 'left' ? dimension.leftDetail : dimension.rightDetail;
    return {
      key: dimension.key,
      left: dimension.left,
      right: dimension.right,
      theme: dimension.theme,
      position: Math.round(position * 10) / 10,
      level,
      phrase,
      detail,
      leftDetail: dimension.leftDetail,
      rightDetail: dimension.rightDetail,
      context: dimension.context
    };
  });
}

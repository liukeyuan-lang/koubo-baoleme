"use strict";

const assert = require("assert");
const { assessMechanicalInteraction, assessAudiencePresence, assessSpeakability } = require("../lib/audience-engagement");

const cases = [
  {
    name: "压力经历旧稿：Hook后观众消失",
    type: "experience",
    script: { hook: "你有没有过这种经历？", sections: [{ label: "经历", text: "老板布置了任务，我提前好几天开始焦虑。我担心做不完，也担心挨批评。后来到了那天，我确实挨了批评。我发现自己前面几天已经提前难受了很多遍。" }] },
    presence: "WEAK",
  },
  {
    name: "压力经历新节奏：预期反转与共同判断",
    type: "experience",
    script: { hook: "老板还没批评我，我已经在脑子里提前挨了好几遍。", sections: [{ label: "经历", text: "任务快到截止日期，手上还有很多没做完。正常来说，这时候应该赶紧做。但我先开始担心做不完、担心挨批评。后来真到了那天，我确实挨了批评。回头一看，我前面几天已经提前难受了很多遍，这不是挺亏的吗？" }] },
    presence: "PASS",
  },
  {
    name: "Codex产品型：观众预期到真实反转",
    type: "product_tool",
    script: { hook: "你可能觉得，有了 Codex，不会代码也能直接把产品做好。", sections: [{ label: "实际使用", text: "我不会代码，现在用自然语言描述需求，让 Codex 生成页面和功能，再不断修改。第一版确实可以做出来。但真做下来我发现，生成结果容易比较浅，能做出来和能做好是两回事。我还是需要边做边学产品。" }] },
    presence: "PASS",
  },
  {
    name: "观点型：挑战熟悉判断，不依赖问句",
    type: "opinion",
    script: { hook: "很多人会觉得，准备得越久，表达就会越稳。", sections: [{ label: "观点", text: "但我的实际感受正好相反。准备时间拉得越长，我越容易反复改，真正要说的东西反而被磨掉。" }] },
    presence: "PASS",
  },
  {
    name: "干货型：指出第一反应和真实错误",
    type: "tutorial",
    script: { hook: "你可能第一反应是先把所有功能都做出来。", sections: [{ label: "方法", text: "但这样最容易卡住。先把最核心的一条流程跑通，再处理旁边的功能。" }] },
    presence: "PASS",
  },
];

for (const item of cases) {
  assert.strictEqual(assessAudiencePresence(item.script, item.type, 60).status, item.presence, item.name);
  assert.strictEqual(assessMechanicalInteraction(item.script).status, "PASS", item.name);
}

const template = { hook: "你有没有这种经历？", sections: [{ label: "正文", text: "这种时候应该赶紧做，对吧？但我不是。你知道吗？你有没有想过？评论区告诉我。" }] };
assert.strictEqual(assessMechanicalInteraction(template).status, "FAIL", "机械互动模板必须失败");
assert.strictEqual(assessMechanicalInteraction({ hook: "", sections: [{ label: "正文", text: "你可能也试过这种方式。" }] }).status, "FAIL", "不能替观众虚构经历");
assert.strictEqual(assessMechanicalInteraction({ hook: "", sections: [{ label: "正文", text: "这一步往往容易被忽略。" }] }).status, "FAIL", "不能补无证据的观众概括");
assert.strictEqual(assessSpeakability({ hook: "", sections: [{ label: "正文", text: "后来我把稿子缩短，再拍的时候。反而能说清楚。" }] }).status, "FAIL", "不能产生悬空半句");

console.log(`Audience Engagement tests passed: ${cases.length + 4}`);

import { NextResponse } from "next/server";

type ReviewMessage = {
  role: "assistant" | "user";
  text: string;
};

type CheckRequest = {
  sessionId?: string;
  rating?: number | null;
  messages?: ReviewMessage[];
  hasMedia?: boolean;
  mediaPromptShown?: boolean;
  questionRound?: number;
  categoryId?: string;
};

const dimensionRules = [
  {
    id: "size",
    label: "尺码",
    questionId: "apparel_size",
    question: "尺码合适吗？可以说说偏大、偏小，还是刚刚好。",
    keywords: ["尺码", "码数", "偏大", "偏小", "合身", "合适", "m码", "s码", "l码", "xl"]
  },
  {
    id: "fabric",
    label: "面料",
    questionId: "apparel_fabric",
    question: "面料摸起来怎么样？比如软不软、厚薄或透不透。",
    keywords: ["面料", "材质", "布料", "棉", "雪纺", "针织", "薄", "厚", "柔软", "舒服", "扎"]
  },
  {
    id: "fit",
    label: "上身效果",
    questionId: "apparel_fit",
    question: "穿上身感觉怎么样？版型、显瘦或日常搭配都可以聊聊。",
    keywords: ["上身", "版型", "显瘦", "显胖", "搭配", "日常", "好看", "修身", "宽松", "垂感"]
  },
  {
    id: "color",
    label: "颜色",
    questionId: "apparel_color",
    question: "颜色和实物看起来一致吗？有没有明显色差？",
    keywords: ["颜色", "色差", "白色", "黑色", "灰色", "卡其", "蓝色", "图片一样", "实物"]
  },
  {
    id: "workmanship",
    label: "做工",
    questionId: "apparel_workmanship",
    question: "做工细节怎么样？比如线头、扣子或缝线。",
    keywords: ["做工", "线头", "缝线", "扣子", "拉链", "细节", "质量", "结实"]
  },
  {
    id: "delivery",
    label: "物流包装",
    questionId: "delivery_packaging",
    question: "物流和包装还好吗？到手时状态怎么样？",
    keywords: ["物流", "快递", "包装", "发货", "送到", "破损", "完整", "很快"]
  }
];

function normalizeText(input: string) {
  return input
    .replace(/\s+/g, "")
    .replace(/[，。！？、,.!?~～…'"“”‘’()[\]{}<>《》:：;；|\\/_+=*-]/g, "");
}

function hasMeaningfulText(input: string) {
  const normalized = normalizeText(input);
  return /[\p{Script=Han}A-Za-z0-9]/u.test(normalized);
}

function effectiveLength(input: string) {
  const normalized = normalizeText(input);
  return Array.from(normalized).filter((char) => /[\p{Script=Han}A-Za-z0-9]/u.test(char)).length;
}

function ratingPrompt(rating?: number | null) {
  if (!rating) return "可以再说说这次真实感受吗？";
  if (rating <= 2) return "主要是哪方面不满意？可以直接写，比如尺码、质量、物流。";
  if (rating === 3) return "哪些地方一般？可以说说尺码、面料或上身效果。";
  return "具体哪里还不错？可以直接写，比如尺码、面料、上身效果。";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckRequest;
    const userText = (body.messages ?? [])
      .filter((message) => message.role === "user" && hasMeaningfulText(message.text))
      .map((message) => message.text)
      .join("");
    const textLen = effectiveLength(userText);
    const hitDimensions = dimensionRules.filter((rule) =>
      rule.keywords.some((keyword) => userText.toLowerCase().includes(keyword.toLowerCase()))
    );
    const hitDimensionList = hitDimensions.map((rule) => rule.label);
    const isLenGe10 = textLen >= 10;
    const isUsefulReviewCandidate = isLenGe10 && hitDimensionList.length > 0;
    const currentRound = body.questionRound ?? 0;
    const nextRound = currentRound >= 2 || isUsefulReviewCandidate ? currentRound : currentRound + 1;

    if (isUsefulReviewCandidate) {
      const shouldPromptMedia = Boolean(userText && !body.hasMedia && !body.mediaPromptShown);
      return NextResponse.json({
        textLen,
        isLenGe10,
        hitDimensionList,
        hitDimensionCount: hitDimensionList.length,
        isUsefulReviewCandidate,
        questionRound: currentRound,
        nextAction: shouldPromptMedia ? "media_prompt" : "stop_prompt",
        nextQuestionId: shouldPromptMedia ? "media_apparel_once" : null,
        nextPromptText: shouldPromptMedia
          ? "要不要补充一张实物图或上身图？其他用户会更容易判断颜色和版型。也可以直接提交。"
          : "已经可以给其他用户提供参考了，写好了可以直接提交。"
      });
    }

    if (currentRound >= 2) {
      return NextResponse.json({
        textLen,
        isLenGe10,
        hitDimensionList,
        hitDimensionCount: hitDimensionList.length,
        isUsefulReviewCandidate,
        questionRound: currentRound,
        nextAction: "stop_prompt",
        nextQuestionId: null,
        nextPromptText: "写好了可以直接提交，也可以再补充你觉得重要的细节。"
      });
    }

    const missingDimension = dimensionRules.find((rule) => !hitDimensions.includes(rule));
    const prompt = !isLenGe10 && !missingDimension ? ratingPrompt(body.rating) : missingDimension?.question;

    return NextResponse.json({
      textLen,
      isLenGe10,
      hitDimensionList,
      hitDimensionCount: hitDimensionList.length,
      isUsefulReviewCandidate,
      questionRound: nextRound,
      nextAction: "continue_prompt",
      nextQuestionId: missingDimension?.questionId ?? "general_followup",
      nextPromptText: prompt ?? "可以再说说具体感受吗？"
    });
  } catch {
    return NextResponse.json({
      textLen: 0,
      isLenGe10: false,
      hitDimensionList: [],
      hitDimensionCount: 0,
      isUsefulReviewCandidate: false,
      questionRound: 0,
      nextAction: "stop_prompt",
      nextQuestionId: null,
      nextPromptText: "写好了可以直接提交。"
    });
  }
}

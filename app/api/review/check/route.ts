import { NextResponse } from "next/server";

type ReviewMessage = {
  role: "assistant" | "user";
  text: string;
  kind?: "prompt" | "system" | "media" | "rating";
};

type CheckRequest = {
  sessionId?: string;
  rating?: number | null;
  messages?: ReviewMessage[];
  hasMedia?: boolean;
  mediaPromptShown?: boolean;
  questionRound?: number;
  categoryId?: string;
  product?: {
    title?: string;
    meta?: string;
  };
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
    question: "面料摸起来怎么样？比如软不软、厚薄、透不透气。",
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
  return input.replace(/\s+/g, "").replace(/[，。！？、,.!?~～"'“”‘’()[\]{}<>《》：:；;\\/_+=*-]/g, "");
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

function localCheck(body: CheckRequest) {
  const userText = (body.messages ?? [])
    .filter((message) => message.role === "user" && message.kind !== "rating" && hasMeaningfulText(message.text))
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
  const nextRound = currentRound >= 3 || isUsefulReviewCandidate ? currentRound : currentRound + 1;

  if (isUsefulReviewCandidate) {
    const shouldPromptMedia = Boolean(userText && !body.hasMedia && !body.mediaPromptShown);
    return {
      textLen,
      isLenGe10,
      hitDimensionList,
      hitDimensionCount: hitDimensionList.length,
      isUsefulReviewCandidate,
      questionRound: currentRound,
      nextAction: shouldPromptMedia ? "media_prompt" : "stop_prompt",
      nextQuestionId: shouldPromptMedia ? "media_apparel_once" : null,
      nextPromptText: shouldPromptMedia
        ? "要不要补充一张实物图或上身图？其他用户会更容易判断颜色和版型。也可以继续说说穿着感受。"
        : "已经很有参考价值了。还想补充的话，可以再说说搭配或洗后感受。"
    };
  }

  if (currentRound >= 3) {
    return {
      textLen,
      isLenGe10,
      hitDimensionList,
      hitDimensionCount: hitDimensionList.length,
      isUsefulReviewCandidate,
      questionRound: currentRound,
      nextAction: "stop_prompt",
      nextQuestionId: null,
      nextPromptText: "这些信息已经可以提交了，也可以再补充你觉得重要的细节。"
    };
  }

  const missingDimension = dimensionRules.find((rule) => !hitDimensions.includes(rule));
  const prompt = !isLenGe10 && !missingDimension ? ratingPrompt(body.rating) : missingDimension?.question;

  return {
    textLen,
    isLenGe10,
    hitDimensionList,
    hitDimensionCount: hitDimensionList.length,
    isUsefulReviewCandidate,
    questionRound: nextRound,
    nextAction: "continue_prompt",
    nextQuestionId: missingDimension?.questionId ?? "general_followup",
    nextPromptText: prompt ?? "可以再说说具体感受吗？"
  };
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, "");
}

async function callAi(body: CheckRequest, fallback: ReturnType<typeof localCheck>) {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!baseUrl || !apiKey || !model) {
    return null;
  }

  const userMessages = (body.messages ?? [])
    .filter((message) => message.role === "user")
    .map((message) => message.text)
    .join("\n");

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content:
            "你是电商服饰评价助手小评。你只提一个简短追问，帮助用户补充真实评价细节。不要替用户写完整评价，不要营销，不要超过45个中文字符。"
        },
        {
          role: "user",
          content: [
            `商品：${body.product?.title ?? "服饰商品"} ${body.product?.meta ?? ""}`,
            `评分：${body.rating ?? "未评分"}`,
            `用户已说：${userMessages || "暂无"}`,
            `本地建议追问：${fallback.nextPromptText}`,
            "请输出下一句追问。"
          ].join("\n")
        }
      ]
    })
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return null;
  }

  return {
    ...fallback,
    nextPromptText: text
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckRequest;
    const fallback = localCheck(body);

    try {
      const aiResult = await callAi(body, fallback);
      if (aiResult) {
        return NextResponse.json(aiResult);
      }
    } catch {
      // Fall back to deterministic local prompts when AI config or network fails.
    }

    return NextResponse.json(fallback);
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
      nextPromptText: "我先记下了。你还可以补充尺码、面料或上身效果。"
    });
  }
}

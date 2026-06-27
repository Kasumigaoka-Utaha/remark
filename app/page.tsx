"use client";

import { ArrowLeft, Camera, ChevronDown, Image as ImageIcon, Mic, Send, Star, X } from "lucide-react";
import Image from "next/image";
import { ChangeEvent, useRef, useState } from "react";

type View = "classic" | "chat" | "success";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  kind?: "prompt" | "system" | "media" | "rating";
};

type CheckResponse = {
  textLen: number;
  isLenGe10: boolean;
  hitDimensionList: string[];
  isUsefulReviewCandidate: boolean;
  questionRound: number;
  nextAction: "continue_prompt" | "stop_prompt" | "media_prompt" | "submit_ready";
  nextQuestionId: string | null;
  nextPromptText: string;
};

const ratingLabels = ["非常差", "较差", "一般", "推荐", "超赞"];

const products = [
  {
    title: "24春夏条纹衬衫 长袖",
    meta: "蓝白条纹 / M码",
    image: "/product-shirt.jpg"
  },
  {
    title: "简约纯棉圆领T恤",
    meta: "白色 / M码",
    image: "/dress.svg"
  },
  {
    title: "轻薄休闲短裤",
    meta: "卡其色 / M码",
    image: "/shorts.svg"
  }
];

const initialPrompt = "先给这单打个分吧，我会根据评分继续问几个细节。";
const assistantAvatar = "/xiaoping-avatar.svg";

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ratingFollowup(value: number) {
  if (value <= 2) return "主要是哪方面不满意？可以说说尺码、质量、物流，或者实际收到后的感受。";
  if (value === 3) return "哪些地方一般？可以说说尺码、面料、颜色或上身效果。";
  return "你觉得哪里最值得推荐？可以说说面料、版型、尺码或上身效果。";
}

function ratingMessage(value: number) {
  return `${value}星 ${ratingLabels[value - 1]}`;
}

function RatingPicker({
  value,
  onChange,
  compact = false
}: {
  value: number | null;
  onChange: (rating: number) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "rating ratingCompact" : "rating"}>
      {ratingLabels.map((label, index) => {
        const rating = index + 1;
        const active = value === rating;
        return (
          <button
            type="button"
            aria-label={`${rating}星 ${label}`}
            className={active ? "ratingButton ratingActive" : "ratingButton"}
            key={label}
            onClick={() => onChange(rating)}
          >
            <Star size={compact ? 21 : 27} fill={active ? "currentColor" : "none"} strokeWidth={2.2} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="stage">
      <section className="phone" aria-label="AI 写评页移动端 demo">
        {children}
      </section>
    </main>
  );
}

function ProductCard({
  collapsed = false,
  productIndex = 0,
  className = ""
}: {
  collapsed?: boolean;
  productIndex?: number;
  className?: string;
}) {
  const product = products[productIndex];
  return (
    <div className={`${collapsed ? "product productCollapsed" : "product"} ${className}`.trim()}>
      <div className="productThumb">
        <Image src={product.image} width={60} height={76} alt={product.title} priority />
      </div>
      <div className="productInfo">
        <strong>{product.title}</strong>
        <span>{product.meta}</span>
      </div>
      <ChevronDown size={18} />
    </div>
  );
}

function ClassicPage({
  rating,
  setRating,
  onEnterChat,
  onSuccess
}: {
  rating: number | null;
  setRating: (value: number) => void;
  onEnterChat: () => void;
  onSuccess: () => void;
}) {
  const [reviewText, setReviewText] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  return (
    <PhoneFrame>
      <header className="topbar">
        <button className="iconButton" aria-label="返回">
          <ArrowLeft size={22} />
        </button>
        <h1>发表评价</h1>
        <button className="ghostButton" type="button" onClick={onEnterChat}>
          AI写评
        </button>
      </header>
      <ProductCard />
      <section className="classicBody">
        <div className="sectionTitle">给这单打个分</div>
        <RatingPicker value={rating} onChange={setRating} />
        <div className="reviewPanel">
          <textarea
            className="reviewArea"
            value={reviewText}
            placeholder="宝贝满足你的期待吗？分享你的真实体验吧"
            maxLength={1000}
            onChange={(event) => setReviewText(event.target.value)}
          />
          <div className="count">{reviewText.length}/1000</div>
          <button className="uploadButton" type="button">
            <Camera size={20} />
            添加图片/视频
          </button>
        </div>
        <div className="publicRow">
          <span>
            <strong>公开评价</strong>
            <em>关闭后仅商家可见</em>
          </span>
          <button
            className={isPublic ? "switch switchOn" : "switch"}
            type="button"
            role="switch"
            aria-checked={isPublic}
            aria-label={isPublic ? "公开评价已开启" : "公开评价已关闭"}
            onClick={() => setIsPublic((current) => !current)}
          />
        </div>
      </section>
      <div className="bottomCta">
        <button className="primaryButton" type="button" onClick={onSuccess}>
          提交评价
        </button>
      </div>
    </PhoneFrame>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "message messageUser" : "message"}>
      {!isUser && (
        <div className="avatar avatarPhoto" aria-hidden="true">
          <Image src={assistantAvatar} width={34} height={34} alt="" />
        </div>
      )}
      <div className={isUser ? "bubble userBubble" : "bubble"}>
        {!isUser && <strong>小评</strong>}
        <p>{message.text}</p>
      </div>
    </div>
  );
}

function ChatPage({
  rating,
  setRating,
  onBack,
  onSuccess
}: {
  rating: number | null;
  setRating: (value: number | null) => void;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [introMessages] = useState<ChatMessage[]>([
    { id: "init", role: "assistant", text: initialPrompt, kind: "prompt" }
  ]);
  const [postRatingMessages, setPostRatingMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [questionRound, setQuestionRound] = useState(0);
  const [mediaPromptShown, setMediaPromptShown] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUseful, setIsUseful] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [hasRated, setHasRated] = useState(Boolean(rating));
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addAssistant(text: string, kind: ChatMessage["kind"] = "prompt") {
    setPostRatingMessages((current) => [...current, { id: createId("assistant"), role: "assistant", text, kind }]);
  }

  function handleRating(value: number) {
    setRating(value);
    setHasRated(true);
    setPostRatingMessages((current) => {
      const afterFirstPrompt = current.filter((message) => message.kind !== "rating" && message.kind !== "prompt");
      return [
        { id: createId("rating"), role: "user", text: ratingMessage(value), kind: "rating" },
        { id: createId("assistant"), role: "assistant", text: ratingFollowup(value), kind: "prompt" },
        ...afterFirstPrompt
      ];
    });
  }

  async function submitText() {
    const text = input.trim();
    if (!text || isChecking) return;

    const nextMessages: ChatMessage[] = [...postRatingMessages, { id: createId("user"), role: "user", text }];
    setPostRatingMessages(nextMessages);
    setInput("");
    setIsChecking(true);

    try {
      const response = await fetch("/api/review/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "demo-session",
          rating,
          messages: nextMessages.map(({ role, text, kind }) => ({ role, text, kind })),
          hasMedia: Boolean(mediaPreview),
          mediaPromptShown,
          questionRound,
          categoryId: "apparel",
          product: products[0]
        })
      });
      const result = (await response.json()) as CheckResponse;
      setQuestionRound(result.questionRound);
      setIsUseful(result.isUsefulReviewCandidate);
      if (result.nextAction === "media_prompt") {
        setMediaPromptShown(true);
      }
      addAssistant(result.nextPromptText, result.nextAction === "media_prompt" ? "media" : "prompt");
    } catch {
      addAssistant("我先记下了。你还可以补充尺码、面料或上身效果。", "system");
    } finally {
      setIsChecking(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMediaPreview(URL.createObjectURL(file));
    addAssistant("太好了，实物图很有参考。还可以再补充一下颜色或上身效果。", "media");
  }

  return (
    <PhoneFrame>
      <header className="topbar">
        <button className="iconButton" aria-label="返回" onClick={onBack}>
          <ArrowLeft size={22} />
        </button>
        <h1>AI写评</h1>
        <span className="topSpacer" />
      </header>
      <ProductCard collapsed className="chatProduct" />
      <section className="chatScroll">
        {introMessages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
        <div className="inlinePanel ratingPanel">
          <span>给这单打个分</span>
          <RatingPicker value={rating} onChange={handleRating} compact />
        </div>
        {postRatingMessages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
        {mediaPreview && (
          <div className="mediaPreview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaPreview} alt="上传预览" />
            <button type="button" aria-label="移除图片" onClick={() => setMediaPreview(null)}>
              <X size={15} />
            </button>
          </div>
        )}
        {isUseful && <div className="qualityPill">已满足有用评价候选标准：10 字 + 1 个有用维度</div>}
      </section>
      <div className="composer">
        <button className="iconButton" aria-label="语音输入">
          <Mic size={22} />
        </button>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submitText();
          }}
          placeholder={hasRated ? "写下你的真实感受" : "先给这单打个分"}
          disabled={!hasRated}
        />
        <input ref={fileInputRef} className="hiddenInput" type="file" accept="image/*" onChange={handleFileChange} />
        <button className="iconButton" aria-label="添加图片" onClick={() => fileInputRef.current?.click()}>
          <ImageIcon size={22} />
        </button>
        <button className="sendButton" type="button" onClick={submitText} disabled={!hasRated || !input.trim() || isChecking}>
          <Send size={15} />
          发送
        </button>
      </div>
      <div className="bottomCta chatCta">
        <button
          className={hasRated ? "primaryButton" : "primaryButton primaryButtonDisabled"}
          type="button"
          onClick={onSuccess}
          disabled={!hasRated}
        >
          提交评价
        </button>
      </div>
    </PhoneFrame>
  );
}

function SuccessPage({ onNext }: { onNext: () => void }) {
  return (
    <PhoneFrame>
      <header className="topbar">
        <button className="iconButton" aria-label="返回">
          <ArrowLeft size={22} />
        </button>
        <h1>评价已提交</h1>
        <span className="topSpacer" />
      </header>
      <section className="success">
        <div className="checkmark">✓</div>
        <h2>感谢你的真实分享！</h2>
        <div className="successBubble">
          <div className="avatar avatarPhoto">
            <Image src={assistantAvatar} width={34} height={34} alt="" />
          </div>
          <div>
            <strong>小评</strong>
            <p>你的评价已提交成功，你还有 2 个待评价订单，要不要继续聊下一单？</p>
          </div>
        </div>
      </section>
      <section className="nextOrders">
        <div className="ordersHead">
          <strong>待评价订单(2)</strong>
          <span>查看全部</span>
        </div>
        {products.slice(1).map((product) => (
          <div className="orderRow" key={product.title}>
            <Image src={product.image} width={42} height={54} alt={product.title} />
            <span>
              <strong>{product.title}</strong>
              <em>{product.meta}</em>
            </span>
            <button type="button" onClick={onNext}>
              评价这单
            </button>
          </div>
        ))}
      </section>
      <div className="bottomCta">
        <button className="primaryButton" type="button" onClick={onNext}>
          去评价下一单
        </button>
        <button className="plainButton" type="button">
          暂时不评价
        </button>
      </div>
    </PhoneFrame>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("classic");
  const [rating, setRating] = useState<number | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  function startNextOrder() {
    setRating(null);
    setSessionKey((current) => current + 1);
    setView("classic");
  }

  if (view === "chat") {
    return (
      <ChatPage
        key={sessionKey}
        rating={rating}
        setRating={setRating}
        onBack={() => setView("classic")}
        onSuccess={() => setView("success")}
      />
    );
  }

  if (view === "success") {
    return <SuccessPage onNext={startNextOrder} />;
  }

  return (
    <ClassicPage
      rating={rating}
      setRating={setRating}
      onEnterChat={() => setView("chat")}
      onSuccess={() => setView("success")}
    />
  );
}

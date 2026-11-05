/**
 * LINE に 1 枚（11-05、4 段目）。確定した順の地図 1 枚の絵と文を見せ、端末の共有で送る。
 * 共有で絵を渡せない端末では「絵を保存」と「文を LINE で送る」「文を写す」に分ける。props だけで受け取る
 */
import Image from "next/image";
import type { ShareState } from "@/hooks/use-order-share";
import { IconShare } from "@/components/icons";

interface Props {
  state: ShareState;
  text: string;
  fileName: string;
  canShareFile: boolean;
  message: string | null;
  onShare: () => void;
  onCopy: () => void;
}

export function LineShare({ state, text, fileName, canShareFile, message, onShare, onCopy }: Props) {
  return (
    <section className="share" aria-label="確定した順を LINE に送る">
      <h2 className="order-group-title">
        <IconShare /> 確定した順を LINE に送る
      </h2>
      <div className="share-body">
        <div className="share-image">
          {state.kind === "ready" ? (
            <a href={state.url} download={fileName} className="share-image-link">
              <Image src={state.url} alt="確定した順の地図 1 枚" fill sizes="(max-width: 640px) 100vw, 640px" unoptimized />
            </a>
          ) : (
            <span className="share-image-empty">{state.kind === "drawing" ? "地図の絵を作っています" : "地図の絵を作れませんでした"}</span>
          )}
        </div>
        <pre className="share-text">{text}</pre>
      </div>
      {canShareFile ? (
        <button type="button" className="button button-primary button-block" onClick={onShare}>
          <IconShare />
          LINE で送る（絵と文）
        </button>
      ) : (
        <div className="share-fallback">
          {state.kind === "ready" && (
            <a className="button button-small" href={state.url} download={fileName}>
              絵を保存
            </a>
          )}
          <a className="button button-primary button-small" href={`https://line.me/R/share?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
            <IconShare />
            文を LINE で送る
          </a>
          <button type="button" className="button button-small" onClick={onCopy}>
            文を写す
          </button>
        </div>
      )}
      {message && <p className="note">{message}</p>}
    </section>
  );
}

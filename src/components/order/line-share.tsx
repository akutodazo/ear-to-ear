/**
 * LINE に 1 枚（11-05、4 段目。11-06 に URL の共有へ、#162）。確定した順のすぐ下に置き（11-06 本人の指示）、ボタンを先に、送る絵と文をその下に見せて 2 段で送る:
 * 「送る準備」で共有の URL を作り、「LINE で送る」で文と URL を端末の共有に渡す（トークに地図のサムネイルが出る）。
 * 共有が無い端末では「文と URL を LINE で送る」「文と URL を写す」。props だけで受け取る
 */
import Image from "next/image";
import type { LinkState, ShareState } from "@/services/order-share-view";
import { IconShare } from "@/components/icons";
import { PassphraseForm } from "@/components/upload/passphrase-form";
import { lineShareHref } from "@/services/order-share-view";

interface Props {
  state: ShareState;
  link: LinkState;
  text: string;
  fileName: string;
  canShare: boolean;
  message: string | null;
  needsPassphrase: boolean;
  loginMessage: string | null;
  loggingIn: boolean;
  onPrepare: () => void;
  onSend: () => void;
  onCopy: () => void;
  onLogin: (passphrase: string) => void;
}

export function LineShare(props: Props) {
  const { state, link, text, fileName, canShare, message } = props;
  return (
    <section className="share" aria-label="確定した順を LINE に送る">
      <h2 className="order-group-title">
        <IconShare /> 確定した順を LINE に送る
      </h2>
      {/* ボタンを先に（11-06 本人の指示: 絵と文の下にあって分かりにくかった）。送るものは下に */}
      {link.kind !== "ready" ? (
        <button
          type="button"
          className="button button-primary button-block"
          onClick={props.onPrepare}
          disabled={state.kind !== "ready" || link.kind === "uploading"}
          aria-busy={link.kind === "uploading"}
        >
          {link.kind === "uploading" ? (
            "共有の URL を作っています…"
          ) : (
            <span className="button-lines">
              <span>1. 送る準備</span>
              <span>（共有の URL を作る）</span>
            </span>
          )}
        </button>
      ) : canShare ? (
        <>
          <button type="button" className="button button-primary button-block" onClick={props.onSend}>
            <IconShare />
            2. LINE で送る
          </button>
          <div className="share-fallback">
            <button type="button" className="button button-small" onClick={props.onCopy}>
              文と URL を写す
            </button>
          </div>
        </>
      ) : (
        <div className="share-fallback">
          <a className="button button-primary button-small" href={lineShareHref(text, link.url)} target="_blank" rel="noreferrer">
            <IconShare />
            2. 文と URL を LINE で送る
          </a>
          <button type="button" className="button button-small" onClick={props.onCopy}>
            文と URL を写す
          </button>
        </div>
      )}
      {props.needsPassphrase && (
        <PassphraseForm
          onSubmit={props.onLogin}
          message={props.loginMessage}
          busy={props.loggingIn}
          lead="共有の URL を作るには合言葉が要ります。入った後に、もう一度「送る準備」を押してください。"
          submitLabel="入る"
        />
      )}
      {message && <p className="note">{message}</p>}
      <p className="note">トークに地図のサムネイルが出ます。URL を知る人は誰でも見られます（60 日で消えます）</p>
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
      {link.kind === "ready" && (
        <p className="note">
          共有の URL: <a href={link.url}>{link.url}</a>
        </p>
      )}
    </section>
  );
}

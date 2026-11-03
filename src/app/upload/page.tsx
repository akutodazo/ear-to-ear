import type { Metadata } from "next";
import Link from "next/link";
import { UploadScreen } from "@/components/upload/upload-screen";

export const metadata: Metadata = {
  title: "写真を送る — ear-to-ear",
};

export default function UploadPage() {
  return (
    <main className="page">
      <p>
        <Link href="/">← ear-to-ear</Link>
      </p>
      <h1>写真を送る</h1>
      <p className="note">撮影した場所は、この端末の外に出しません。送るのは近い畑の番号だけです。</p>
      <UploadScreen />
    </main>
  );
}

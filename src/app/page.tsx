import Link from "next/link";

export default function Home() {
  return (
    <main className="page">
      <h1>ear-to-ear</h1>
      <p>穂から穂へ、写真と判断をつなぐ</p>
      <nav className="stack">
        <Link className="button button-primary" href="/upload">
          写真を送る
        </Link>
        <Link className="button" href="/recent">
          新着を見る
        </Link>
      </nav>
    </main>
  );
}

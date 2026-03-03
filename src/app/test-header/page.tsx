"use client";

export default function TestHeaderPage() {
  return (
    <div>
      <header style={{ background: "red", padding: "20px", position: "fixed", top: "0", width: "100%", zIndex: "9999" }}>
        TEST HEADER - This should be visible
      </header>
      <main style={{ marginTop: "100px", padding: "20px" }}>
        <h1>Test Page Content</h1>
        <p>Scroll down to see if header stays fixed</p>
        <div style={{ height: "2000px", background: "lightgray", marginTop: "20px" }}>
          Long content to test scrolling
        </div>
      </main>
    </div>
  );
}

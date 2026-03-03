export function Footer() {
  return (
    <footer className="mt-auto border-t bg-white text-slate-800">
      <div className="w-full px-4 py-4">
        <p className="text-center text-sm text-muted-foreground">
          EURL LA SOURCE Invoice Management System © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}

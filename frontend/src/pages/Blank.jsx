export default function Blank() {
  // Site is currently deactivated. Public-facing pages render blank.
  // Admins can still reach /admin via direct URL.
  return (
    <div
      data-testid="site-blank"
      style={{
        minHeight: "100vh",
        background: "#ffffff",
      }}
    />
  );
}


export default function ConcentricLoader() {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <div className="absolute h-full w-full animate-spin rounded-full border-4 border-transparent border-t-primary" style={{ animationDuration: '1.5s' }} />
      <div className="absolute h-10 w-10 animate-spin rounded-full border-4 border-transparent border-t-accent" style={{ animationDuration: '2s', animationDirection: 'reverse' }}/>
    </div>
  );
}

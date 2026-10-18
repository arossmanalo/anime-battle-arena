import { Button } from '../components/kit';

export function NotFound({ what = 'page' }: { what?: string }) {
  return (
    <div className="page center">
      <div className="big404">404</div>
      <h1>That {what} does not exist</h1>
      <p className="lede">It may have been removed, or the link is wrong.</p>
      <div className="hero-actions">
        <Button to="/">Home</Button>
        <Button to="/roster" variant="plain">
          Roster
        </Button>
      </div>
    </div>
  );
}

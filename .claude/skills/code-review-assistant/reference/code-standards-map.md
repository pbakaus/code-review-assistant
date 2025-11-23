# Code Standards Map

Quick reference of detectable issues. If any match the diff, grep the full section from `code-standards.md` using the XML tag.

## React Patterns
- `<use-effect-data-fetch>` - useEffect for data fetching
- `<missing-memoization>` - Complex calculations without useMemo
- `<inline-jsx-functions>` - Inline arrow functions in JSX

## Database & Migrations
- `<modified-migration>` - Modified existing migration file
- `<missing-indexes>` - New tables without indexes
- `<n-plus-one>` - N+1 query patterns in loops

## Security
- `<exposed-secrets>` - Hardcoded API keys or secrets
- `<sql-injection>` - String concatenation in SQL queries
- `<missing-validation>` - API endpoints without input validation
- `<missing-auth>` - Endpoints without authentication

## Stripe Integration
- `<missing-webhook-verify>` - Webhook without signature verification
- `<missing-idempotency>` - Mutations without idempotency keys
- `<unhandled-stripe-errors>` - No error handling for Stripe calls

## Performance
- `<large-bundle>` - Large library imports without tree-shaking
- `<missing-lazy-load>` - Heavy components not lazy loaded


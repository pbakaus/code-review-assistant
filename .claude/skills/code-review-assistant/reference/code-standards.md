# Code Standards & Common Concerns

Company coding standards and anti-patterns to detect. Each section has an XML tag for targeted access.

---

<use-effect-data-fetch>
## 🔴 Critical: useEffect for Data Fetching

**Pattern to Detect:**
```tsx
useEffect(() => {
  fetch('/api/data').then(/* ... */);
}, []);
```

**Why It's a Problem:**
- Race conditions when component unmounts during fetch
- No automatic retry logic
- Poor loading and error state management
- Memory leaks if not cleaned up properly
- Difficult to handle complex scenarios

**Recommended Solution:**
```tsx
// Use React Query or SWR
import { useQuery } from '@tanstack/react-query';

const { data, isLoading, error } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId)
});
```

**When to Flag:**
- Any `useEffect` containing `fetch`, `axios`, or API calls
- Particularly critical if no cleanup function is present
- Extra concern if dependencies array is complex

</use-effect-data-fetch>

---

<missing-memoization>
## 🟡 Warning: Missing Memoization for Expensive Calculations

**Pattern to Detect:**
```tsx
function Dashboard({ data }) {
  const metrics = calculateComplexMetrics(data); // Runs every render
  return <div>{metrics}</div>;
}
```

**Why It's a Problem:**
- Performance degradation on every render
- Especially problematic with large datasets
- Can cause cascading re-renders

**Recommended Solution:**
```tsx
function Dashboard({ data }) {
  const metrics = useMemo(
    () => calculateComplexMetrics(data),
    [data]
  );
  return <div>{metrics}</div>;
}
```

**When to Flag:**
- Complex calculations not wrapped in `useMemo`
- Array operations like `.map()`, `.filter()`, `.reduce()` on large datasets
- Object/array creation that's passed to child components

</missing-memoization>

---

<inline-jsx-functions>
## 🟡 Warning: Inline Functions in JSX

**Pattern to Detect:**
```tsx
<Button onClick={() => handleClick(id)} />
```

**Why It's a Problem:**
- Creates new function on every render
- Breaks `React.memo` optimization
- Can cause child component re-renders

**Recommended Solution:**
```tsx
const handleClickCallback = useCallback(() => {
  handleClick(id);
}, [id]);

<Button onClick={handleClickCallback} />
```

**When to Flag:**
- Inline arrow functions in JSX, especially in lists
- When passed to memoized components
- Lower priority if component renders infrequently

</inline-jsx-functions>

---

<modified-migration>
## 🔴 Critical: Modified Existing Migration

**Pattern to Detect:**
- Changes to files in `db/migrations/`, `migrations/`, or similar directories
- Files older than 7 days being modified (not added)
- Check git history: `git log --follow <migration-file>`

**Why It's a Problem:**
- Migrations are immutable once deployed
- Modifying existing migrations causes environment inconsistencies
- Can break production databases
- Other developers may have already run the old version

**Recommended Solution:**
Create a new migration file instead:
```sql
-- NEW FILE: migrations/20240123_alter_users_table.sql
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
```

**When to Flag:**
- Any modification to migration files older than 7 days
- Critical priority if file is from a previous release
- Check if file exists in main/production branch

</modified-migration>

---

<missing-indexes>
## 🟡 Warning: Missing Database Indexes

**Pattern to Detect:**
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
-- Missing: INDEX on user_id for lookups
```

**Why It's a Problem:**
- Slow queries on foreign keys
- Table scans on frequently queried columns
- Performance degrades with data growth

**Recommended Solution:**
```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

**When to Flag:**
- New tables with foreign keys but no indexes
- Columns likely to be used in WHERE clauses
- Timestamp columns used for sorting/filtering

</missing-indexes>

---

<n-plus-one>
## 🟡 Warning: N+1 Query Patterns

**Pattern to Detect:**
```tsx
// In component or API route
users.forEach(async user => {
  const orders = await db.query('SELECT * FROM orders WHERE user_id = $1', [user.id]);
  // N+1: One query per user
});
```

**Why It's a Problem:**
- Exponential performance degradation
- Database connection pool exhaustion
- Slow API responses

**Recommended Solution:**
```tsx
// Batch query
const userIds = users.map(u => u.id);
const orders = await db.query(
  'SELECT * FROM orders WHERE user_id = ANY($1)',
  [userIds]
);
```

**When to Flag:**
- Queries inside loops
- Sequential database calls that could be batched
- ORM operations without proper includes/joins

</n-plus-one>

---

<exposed-secrets>
## 🔴 Critical: Exposed Secrets or API Keys

**Pattern to Detect:**
```tsx
const stripeKey = 'sk_live_abc123...'; // Hardcoded secret!
const apiKey = 'AIzaSy...'; // API key in code
```

**Why It's a Problem:**
- Secrets committed to git are compromised forever
- Anyone with repo access can see credentials
- Keys may be exposed in public repos

**Recommended Solution:**
```tsx
// Use environment variables
const stripeKey = process.env.STRIPE_SECRET_KEY;

// Or secrets management
const apiKey = await secretsManager.getSecret('API_KEY');
```

**When to Flag:**
- Any string that looks like: `sk_live_`, `pk_`, `AIza`, `ghp_`, etc.
- Hardcoded passwords or tokens
- Database connection strings with credentials
- Anything marked `SECRET`, `PASSWORD`, `TOKEN`, `KEY` in code

</exposed-secrets>

---

<sql-injection>
## 🔴 Critical: SQL Injection Vulnerability

**Pattern to Detect:**
```tsx
// String concatenation in SQL
const query = `SELECT * FROM users WHERE id = ${userId}`;
db.query(query);

// Template literals with user input
const result = await db.query(`
  SELECT * FROM products WHERE name = '${req.body.name}'
`);
```

**Why It's a Problem:**
- User input can inject malicious SQL
- Can lead to data theft, deletion, or modification
- One of the most critical security vulnerabilities

**Recommended Solution:**
```tsx
// Use parameterized queries
const query = 'SELECT * FROM users WHERE id = $1';
db.query(query, [userId]);

// ORM with proper escaping
const user = await User.findOne({ where: { id: userId } });
```

**When to Flag:**
- String concatenation or template literals in SQL queries
- Any user input directly in query strings
- Dynamic WHERE clauses without parameterization

</sql-injection>

---

<missing-validation>
## 🟡 Warning: Missing Input Validation

**Pattern to Detect:**
```tsx
app.post('/api/user', async (req, res) => {
  const user = await db.createUser(req.body); // No validation!
  res.json(user);
});
```

**Why It's a Problem:**
- Allows malformed or malicious input
- Can cause database errors
- May expose internal error messages

**Recommended Solution:**
```tsx
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  age: z.number().min(0).max(120)
});

app.post('/api/user', async (req, res) => {
  const validated = userSchema.parse(req.body);
  const user = await db.createUser(validated);
  res.json(user);
});
```

**When to Flag:**
- API endpoints accepting `req.body` without validation
- User input directly used in operations
- Missing type checking or bounds checking

</missing-validation>

---

<missing-auth>
## 🟡 Warning: Missing Authentication on API Routes

**Pattern to Detect:**
```tsx
// API route without auth check
app.delete('/api/users/:id', async (req, res) => {
  await db.deleteUser(req.params.id);
  res.json({ success: true });
});
```

**Why It's a Problem:**
- Unauthorized access to sensitive operations
- Data leakage or manipulation
- Compliance violations

**Recommended Solution:**
```tsx
app.delete('/api/users/:id', authenticateUser, async (req, res) => {
  // Check permissions
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  await db.deleteUser(req.params.id);
  res.json({ success: true });
});
```

**When to Flag:**
- DELETE, PUT, PATCH endpoints without authentication
- Sensitive GET endpoints (user data, admin routes)
- Missing authorization checks for resource ownership

</missing-auth>

---

<missing-webhook-verify>
## 🔴 Critical: Missing Webhook Signature Verification

**Pattern to Detect:**
```tsx
app.post('/webhooks/stripe', async (req, res) => {
  const event = req.body; // No verification!
  if (event.type === 'payment_intent.succeeded') {
    // Process payment
  }
});
```

**Why It's a Problem:**
- Anyone can POST fake webhook events
- Can trigger unauthorized operations
- Financial and security risk

**Recommended Solution:**
```tsx
app.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Now process verified event
});
```

**When to Flag:**
- Stripe webhook endpoints without `constructEvent`
- Missing signature verification
- Processing `req.body` directly

</missing-webhook-verify>

---

<missing-idempotency>
## 🟡 Warning: Missing Idempotency Keys

**Pattern to Detect:**
```tsx
// Creating charges without idempotency key
await stripe.charges.create({
  amount: 2000,
  currency: 'usd',
  source: token
});
```

**Why It's a Problem:**
- Network retries can cause duplicate charges
- Race conditions in payment processing
- Customer charged multiple times

**Recommended Solution:**
```tsx
await stripe.charges.create({
  amount: 2000,
  currency: 'usd',
  source: token
}, {
  idempotencyKey: `charge_${orderId}_${userId}`
});
```

**When to Flag:**
- Payment mutations without idempotency keys
- Subscription creation/updates without keys
- Refund operations

</missing-idempotency>

---

<unhandled-stripe-errors>
## 🔵 Suggestion: Unhandled Stripe Errors

**Pattern to Detect:**
```tsx
const paymentIntent = await stripe.paymentIntents.create({...});
// No error handling
```

**Recommended Solution:**
```tsx
try {
  const paymentIntent = await stripe.paymentIntents.create({...});
} catch (err) {
  if (err.type === 'StripeCardError') {
    // Card was declined
  } else if (err.type === 'StripeInvalidRequestError') {
    // Invalid parameters
  }
  // Log and handle appropriately
}
```

</unhandled-stripe-errors>

---

<large-bundle>
## 🟡 Warning: Large Bundle Size Increases

**Pattern to Detect:**
- Import of large libraries in client-side code
- Example: `import * as _ from 'lodash'` (entire library)
- Importing moment.js, date-fns without tree-shaking

**Recommended Solution:**
```tsx
// Before
import _ from 'lodash';

// After
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';
```

**When to Flag:**
- Wildcard imports from large libraries
- New heavy dependencies in frontend code
- Missing lazy loading for large components

</large-bundle>

---

<missing-lazy-load>
## 🔵 Suggestion: Missing Lazy Loading

**Pattern to Detect:**
```tsx
import HeavyComponent from './HeavyComponent';
import LargeChart from './LargeChart';

function App() {
  return (
    <Router>
      <Route path="/analytics" element={<LargeChart />} />
    </Router>
  );
}
```

**Recommended Solution:**
```tsx
const HeavyComponent = lazy(() => import('./HeavyComponent'));
const LargeChart = lazy(() => import('./LargeChart'));
```

**When to Flag:**
- Large components not needed on initial load
- Route components that could be code-split
- Modal content or tabs

</missing-lazy-load>

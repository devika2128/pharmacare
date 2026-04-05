# In-Depth Code Explanation

This document serves as a "code walkthrough" to help you understand what the code is physically doing behind the scenes. If your teacher points to a file and says *"Explain this to me"*, use this guide.

---

## 1. The Database Client (`src/utils/supabase.js`)
**What it does:** This is the bridge between your Next.js website and the PostgreSQL database.
**Code Explanation:**
*   It uses `createClient()` from the Supabase SDK.
*   It feeds in the `URL` and `ANON_KEY` from your `.env.local` file to securely authorize the connection to Vercel/Supabase.
*   Every other file in the project imports this `supabase` object to run queries.

---

## 2. Authentication Logic (`src/app/login/page.js`)
**What it does:** Handles logging users in and assigning them roles.
**Code Explanation:**
When an employee clicks "Login":
1.  The `handleLogin` function triggers a query: `await supabase.from('employee').select('*').eq('email', email)`
2.  In standard SQL, this translates to: `SELECT * FROM employee WHERE email = 'user@email.com';`
3.  If the database returns a user, the script checks if `user.title` equals 'Admin', 'Pharmacist', or 'Staff' and stores that globally using React Context so the system knows what buttons to hide/show.

---

## 3. The Point of Sale Module (`src/app/(dashboard)/sales/page.js`)
**What it does:** The most complex file. Handles searching drugs, generating bills, and inserting records.
**Database Code Walkthrough (`handleConfirm` function):**
When the user clicks "Complete Transaction", the Javascript explicitly performs a **4-step Database Transaction**:
1.  **Customer Insert:** `supabase.from('customer').insert([...])`
    *   *SQL Equivalent:* `INSERT INTO customer (name, phone) VALUES (...)`
    *   *Logic:* It inserts the customer and returns the new `customer_id`.
2.  **Sales Insert:** `supabase.from('sales').insert([{ total_amount, customer_id, employee_id }])`
    *   *SQL Equivalent:* `INSERT INTO sales (...) VALUES (...)`
    *   *Logic:* Using the `customer_id` from step 1, it logs the financial record and returns the new `sale_id`.
3.  **Includes Link Insert:** `supabase.from('includes').insert([{ sale_id, medicine_id }])`
    *   *Logic:* It uses the `sale_id` from step 2 to permanently link the drug sold to the transaction receipt.
4.  **Prescription Insert (If required):** `supabase.from('prescription').insert([...])`
    *   *Logic:* If the selected drug requires a prescription, it attaches the doctor's details to the same `sale_id`.

*All of these are chained together using `async/await` so if one fails, the code throws a visible error on the screen.*

---

## 4. The Inventory Logic (`src/app/(dashboard)/medicines/page.js`)
**What it does:** Complete CRUD (Create, Read, Update, Delete) capability for medications.
**Code Explanation:**
*   **READ:** `supabase.from('medicine').select('*')` (Loads all inventory).
*   **CREATE:** In the `handleAddNew` function, it takes the form data and runs `.insert()` to add a new drug.
*   **UPDATE:** In `handleSave`, it uses `.update({ price, batch_number }).eq('medicine_id', editingId)`. The `.eq()` is the exact same as an SQL `WHERE` clause!
*   **DELETE:** Runs `.delete().eq('medicine_id', id)` to eradicate a drug from the database.

---

## 5. Live Reports & Real-Time Sync (`src/app/(dashboard)/reports/page.js`)
**What it does:** This summarizes the financial data and tracks active stock levels out of 100%.
**Code Explanation:**
*   **Data Aggregation:** The code fetches all `sales` and `purchases` arrays. It runs JavaScript `.reduce()` methods to sum up `total_amount` columns mathematically to graph the total Revenue vs Total Cost.
*   **WebSockets (Real-time):** You will see code that looks like `supabase.channel('public:sales').on('postgres_changes', { event: 'INSERT' })`.
    *   *Explanation:* This is an advanced WebSocket listener. Instead of asking the database for updates every 5 seconds, the database physically pushes a notification to the code instantly whenever a new `INSERT` happens on the `SALES` table. The code then re-fetches the numbers to dynamically push the dashboard charts higher!
    
---

## 6. The Database Schema (`supabase_schema.sql`)
**What it does:** Your SQL blueprint. Evaluators love seeing this.
**Code Explanation:**
*   **Constraints:** You can explain how you used `NOT NULL` on critical dates, and `DEFAULT 0` on `available_quantity` so it doesn't crash if omitted.
*   **Foreign Keys:** You can point out `ON DELETE CASCADE` in the `PRESCRIPTION` table. Explain that if a developer deletes a `SALE`, Postgres automatically traverses the relationships and deletes the `PRESCRIPTION` attached to it to prevent "dirty data".
*   **PL/pgSQL Triggers:** Explain that the `EXECUTE FUNCTION deduct_stock_on_sale()` blocks exist so that the database strictly enforces inventory rules internally, rather than depending purely on messy frontend JavaScript.

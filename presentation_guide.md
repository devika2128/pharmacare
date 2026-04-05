# Pharmacy Management System - Presentation Guide

This guide breaks down every core component of your project so you can confidently explain it to your evaluator. The goal is to highlight not just what the app does, but **how it demonstrates your understanding of Database Management Systems (DBMS)**.

---

## 1. Project Architecture Overview

**"What technologies did you use and why?"**
*   **Frontend (User Interface):** Built with **Next.js** (React) for a lightning-fast, interactive user interface.
*   **Backend & Database:** Powered by **Supabase**, which provides a cloud-hosted **PostgreSQL** database. 
*   **Why Supabase?** We chose Supabase because it allows us to interact directly with a robust, strictly relational PostgreSQL database via API, while still utilizing advanced features like Triggers and Real-time syncing.

---

## 2. The Database Schema (The Heart of the Project)

Your teacher will want to know how you structured the tables. You successfully mapped an ER Diagram into a Relational Schema:

*   **Entities (Tables):**
    *   `MEDICINE`: Manages the core inventory (Primary Key: `medicine_id`).
    *   `EMPLOYEE` & `CUSTOMER` & `SUPPLIER`: Manages people and businesses involved in the transactions.
    *   `SALES` & `PURCHASE`: Manages the financial transactions.
    *   `PRESCRIPTION`: Stores strict medical compliance data.
*   **Relationships (Foreign Keys):**
    *   The `SALES` table sits at the center, linking the `customer_id` and the `employee_id`. 
    *   To link `SALES` to `MEDICINE`, we use a Many-to-Many resolution table called `INCLUDES`.
    *   The `PRESCRIPTION` table is linked to `SALES` via `sale_id`, enforcing a rule that a prescription record cannot exist without a valid sale.

---

## 3. Advanced DBMS Features (Your "A+" Selling Points)

*Make sure to emphasize these points during your presentation, as they prove you didn't just build a web app, but actually engineered a true Database System.*

### A. Database Triggers (Automated Integrity)
Instead of relying on the website's JavaScript to do math, the database manages itself. We implemented **PostgreSQL Triggers** (`after_sale_insert` and `after_purchase_insert`). 
*   **How to explain it:** *"When a cashier finalizes a sale, the frontend only inserts a row into the `SALES` and `INCLUDES` tables. The database Engine immediately detects this insertion, fires a Trigger, and executes a PL/pgSQL function to autonomously deduct the exact quantity from the `MEDICINE` table. This prevents race conditions and ensures data integrity even if the frontend crashes."*

### B. Real-Time WebSockets (Postgres Changes)
*   **How to explain it:** *"The Reports module doesn't just statically load data. It subscribes to PostgreSQL WAL (Write-Ahead Log) changes. If another employee logs a sale from a different computer, the Reports dashboard updates instantly without refreshing the page."*

### C. Relational Integrity (`ON DELETE CASCADE`)
*   **How to explain it:** *"We strictly enforced foreign key constraints. For example, the `PRESCRIPTION` table enforces `ON DELETE CASCADE`. If an administrator voids and deletes a Sale, the attached Prescription data is automatically wiped out by Postgres, preventing orphaned data."*

---

## 4. Understanding System Flows (Walkthroughs)

If your teacher asks you to "walk them through a process", use these flows:

### The "Point of Sale" (POS) Flow:
1.  **Search & Validation:** The pharmacist searches for a drug.
2.  **Prescription Check:** The system reads the `requires_prescription` Boolean in the database. If `TRUE`, the frontend dynamically halts the cashier and forces them to input Doctor details.
3.  **Transaction Commit:** Upon confirmation:
    *   Inserts row into `CUSTOMER` (if new).
    *   Inserts row into `SALES` (financial record).
    *   Inserts row into `INCLUDES` (linking the sale to the specific drug).
    *   Inserts row into `PRESCRIPTION` (if applicable).
4.  **Trigger Fire:** The DB Trigger natively deducts stock. All these happen sequentially to form a logical Database Transaction.

### The Authentication Flow:
*   We bypassed complex third-party authentication algorithms to build our own logical role-based access. When a user logs in, the query checks the `EMPLOYEE` table. Based on their specific data (like their title or ID), the application assigns them `Admin`, `Pharmacist`, or `Staff` privileges, actively restricting what tables they can view or edit (e.g., stopping Staff from seeing total revenue metrics).

---

## Tips For Your Presentation
1.  **Keep the console output or pgAdmin/Supabase dashboard open.** Show the teacher visually that when a sale happens on the website, a row physically drops into the database.
2.  **Showcase the error handling.** Try to sell an item with a quantity higher than the DB has in stock to prove that logic safeguards are in place.
3.  **Talk about table normalization.** Mention how you avoided redundancy (e.g., storing Customer data once in a `CUSTOMER` table rather than repeating names and addresses on every single receipt).

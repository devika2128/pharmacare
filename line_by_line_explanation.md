# Line-by-Line Code Explanation 

If your teacher puts the code on the screen and asks you exactly what a specific block of code does line-by-line, read directly from this document. We will cover the most important database operations in your project.

---

## 1. The Core Transaction (`src/app/(dashboard)/sales/page.js`)
This is the most important function in your project. It fires when a pharmacist clicks "Complete Transaction". It handles inserting data into 4 different tables sequentially.

```javascript
// Function starts when "Complete Transaction" is clicked
const handleConfirm = async () => {

// LINE 82: Change a variable to TRUE to disable the button so the user can't click "Buy" twice.
  setIsSubmitting(true);
  let finalCustId = null;

  try {
// ==================== [ STEP 1: CUSTOMER TABLE ] ====================
// LINE 87: Check if the user selected an existing customer from the dropdown. 
// If yes, we grab their ID.
    if (selectedCustomer) {
       finalCustId = selectedCustomer.customer_id;
    } else {
// LINE 92: If it's a NEW customer, we use Supabase to run an INSERT query into the 'customer' table.
       const { data: custData, error: custErr } = await supabase.from('customer').insert([{
          name: finalCustomerName,
          phone_number: customerPhone || null,
          address: customerAddress || null
       }]).select(); // LINE 96: .select() tells the database to return the newly generated row back to us.
       
// LINE 98: If the database throws an error (like missing a NOT NULL value), we stop the operation.
       if (custErr) throw custErr;
// LINE 99: We capture the Database-generated Primary Key (`customer_id`) so we can use it in the next query!
       finalCustId = custData[0].customer_id;
    }

// ==================== [ STEP 2: SALES TABLE ] ====================
// LINE 112: Now, we run an INSERT query into the 'sales' table.
    const { data: saleData, error: saleErr } = await supabase.from('sales').insert([{
       sale_date: new Date().toISOString().split('T')[0], // Grabs today's date formatted as YYYY-MM-DD
       total_amount: totalAmount, // The calculated exact price.
       customer_id: finalCustId,  // We use the ID we just generated in Step 1 as a Foreign Key!
       employee_id: parseInt(selectedEmployeeId) // We pass the logged-in employee's Foreign Key.
    }]).select();

    if (saleErr) throw saleErr;
// LINE 120: Just like before, we grab the newly generated `sale_id` Primary Key to use in the next step.
    const newSaleId = saleData[0].sale_id;

// ==================== [ STEP 3: INCLUDES TABLE (Many-to-Many Linking) ] ====================
// LINE 123: We must record WHICH medicine was sold on this specific receipt.
    const { error: incErr } = await supabase.from('includes').insert([{
       sale_id: newSaleId, // The Foreign Key from the Sales table generated in Step 2.
       medicine_id: selectedMed.medicine_id, // The Foreign Key of the drug the pharmacist scanned.
       quantity: parseInt(saleQty) // How many boxes they bought.
    }]);
// *NOTE*: We don't need .select() here because we don't need Postgres to return data to us from a linking table.

// ==================== [ STEP 4: PRESCRIPTION TABLE ] ====================
// LINE 139: Checks if the 'requires_prescription' Boolean is true for this specific drug.
    if (selectedMed.requires_prescription) {
// LINE 141: If true, execute a completely new INSERT query into the 'prescription' table.
       const { error: rxErr } = await supabase.from('prescription').insert([{
          doctor_name: prescriptionDetails.doctor_name,
          place: prescriptionDetails.place,
          prescription_number: prescriptionDetails.prescription_number,
          prescription_date: prescriptionDetails.prescription_date,
          sale_id: newSaleId // Using the EXACT SAME sale_id from Step 2 to link the prescription to the receipt.
       }]);
       if (rxErr) throw rxErr;
    }

// ==================== [ SUCCESS ] ====================
// LINE 155: If no errors were thrown by the DB, show a green "Success" toast message on the screen.
    toast.success("Sale Confirmed and Saved nicely to DB!");
// LINE 156: Switch the visual UI to Step 3 (The printable Final Receipt window).
    setIsDone(true);
  } catch (err) {
// LINE 158: If ANY of the Database Queries above failed, Javascript catches the error here.
    toast.error("Failed to confirm sale: " + err.message);
  }
}
```

---

## 2. Advanced DB Triggers (`supabase_schema.sql`)
This is the raw PostgreSQL code that automates your inventory inside the database engine.

```sql
-- LINE 1: We create a custom PL/pgSQL function named "deduct_stock_on_sale".
CREATE OR REPLACE FUNCTION deduct_stock_on_sale() 
RETURNS TRIGGER AS $$
BEGIN
-- LINE 5: We execute an UPDATE query on the medicine table.
-- We mathematically calculate: Current stock = Current stock - the quantity just sold (NEW.quantity).
   UPDATE medicine
   SET available_quantity = available_quantity - NEW.quantity
-- LINE 8: The WHERE clause guarantees we only deduct stock from the specific drug that was sold.
   WHERE medicine_id = NEW.medicine_id;
-- LINE 9: We tell PostgreSQL that the function is finished and safe to commit.
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- LINE 13: We declare the actual structural "Trigger" logic.
CREATE TRIGGER after_sale_insert
-- LINE 14: This trigger will fire AFTER A ROW IS INSERTED completely randomly.
AFTER INSERT ON includes
-- LINE 15: For every single row inserted...
FOR EACH ROW
-- LINE 16: ...Execute the mathematical function we defined up on Line 1.
EXECUTE FUNCTION deduct_stock_on_sale();
```

---

## 3. Real-Time Dashboard Subscription (`src/app/(dashboard)/reports/page.js`)
If your teacher asks how the charts update live without refreshing, explain this block.

```javascript
// LINE 30: We call Supabase's built-in realtime channel functionality.
const channel = supabase.channel('realtime_reports')
// LINE 31: We tell it to strictly listen for any 'INSERT' operations on the 'sales' table.
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' }, (payload) => {
// LINE 32: If an insert happens anywhere in the world on that table, Postgres instantly sends a payload here.
      console.log('New sale detected!', payload);
// LINE 33: We manually order the Javascript to re-fetch the new Data to refresh the React graphs.
      fetchData(); 
  })
// LINE 39: Initiates the WebSocket subscription link to the backend.
  .subscribe();

// LINE 41: Because this is React, if the user leaves the page, we securely cleanup and destroy the WebSocket link so it doesn't cause memory leaks.
return () => { supabase.removeChannel(channel); };
```

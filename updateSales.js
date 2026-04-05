const fs = require('fs');
let code = fs.readFileSync('src/app/(dashboard)/sales/page.js', 'utf8');

code = code.replace(
  "const [selectedMed, setSelectedMed] = useState(null);\n  const [saleQty, setSaleQty] = useState(1);",
  "const [cart, setCart] = useState([]);"
);

const addFunc = `
  const addToCart = (med) => {
    const existing = cart.find(item => item.medicine.medicine_id === med.medicine_id);
    if (existing) {
       toast.error("Already in basket, update quantity in Details step.");
    } else {
       if (med.available_quantity <= 0) {
         toast.error("Out of Stock!");
         return;
       }
       setCart([...cart, { medicine: med, qty: 1 }]);
       toast.success("Added to cart!");
    }
  };
`;
code = code.replace("const handleSearchKeyDown =", addFunc + "\n  const handleSearchKeyDown =");

code = code.replace("setSelectedMed(filteredMedicines[0]);", "addToCart(filteredMedicines[0]);");
code = code.replace("onClick={() => setSelectedMed(med)}", "onClick={() => addToCart(med)}");

code = code.replace(/border: selectedMed\?.medicine_id === med\.medicine_id [^:]+: /g, "border: cart.some(c => c.medicine.medicine_id === med.medicine_id) ? ");
code = code.replace(/background: selectedMed\?.medicine_id === med\.medicine_id [^:]+: /g, "background: cart.some(c => c.medicine.medicine_id === med.medicine_id) ? ");

code = code.replace("disabled={!selectedMed || selectedMed.available_quantity <= 0}", "disabled={cart.length === 0}");

code = code.replace("if (!selectedMed || !selectedEmployeeId)", "if (cart.length === 0 || !selectedEmployeeId)");

code = code.replace(
  "if (saleQty > selectedMed.available_quantity) {\n       toast.error(\"Cannot sell more than available quantity!\");\n       return;\n    }",
  `
    const invalid = cart.find(c => c.qty > c.medicine.available_quantity);
    if (invalid) {
       toast.error(invalid.medicine.name + " maximum quantity exceeded!");
       return;
    }
  `
);

code = code.replace(
  "const totalAmount = parseFloat((selectedMed.price * saleQty).toFixed(2));",
  "const totalAmount = parseFloat(cart.reduce((s, i) => s + (i.medicine.price * i.qty), 0).toFixed(2));"
);

code = code.replace(
  "const { error: incErr } = await supabase.from('includes').insert([{\n         sale_id: newSaleId,\n         medicine_id: selectedMed.medicine_id,\n         quantity: parseInt(saleQty)\n      }]);",
  `const includesData = cart.map(item => ({
        sale_id: newSaleId,
        medicine_id: item.medicine.medicine_id,
        quantity: parseInt(item.qty)
      }));
      const { error: incErr } = await supabase.from('includes').insert(includesData);`
);

code = code.replace(/const newQty = selectedMed\.available_quantity - saleQty;[\s\S]+?setMedicines\(medicines\.map[\s\S]+?\);/g, `
      // Medicine update locally
      setMedicines(medicines.map(m => {
         const sold = cart.find(c => c.medicine.medicine_id === m.medicine_id);
         if (sold) return { ...m, available_quantity: m.available_quantity - sold.qty };
         return m;
      }));

      // 5. Store Prescription Details if it requires Rx
      const requiresRx = cart.some(c => c.medicine.requires_prescription);
      if (requiresRx) {
         const { error: rxErr } = await supabase.from('prescription').insert([{
            doctor_name: prescriptionDetails.doctor_name,
            place: prescriptionDetails.place,
            prescription_number: prescriptionDetails.prescription_number,
            prescription_date: prescriptionDetails.prescription_date,
            sale_id: newSaleId
         }]);
         if (rxErr) throw rxErr;
      }
`);

code = code.replace("!saleQty || saleQty <= 0", "cart.length === 0");
code = code.replace("saleQty > selectedMed.available_quantity", "cart.some(c => c.qty > c.medicine.available_quantity)");
code = code.replace("selectedMed.requires_prescription", "cart.some(c => c.medicine.requires_prescription)");

// Details step
code = code.replace(
  /<div className="form-group" style={{ gridColumn: 'span 2' }}>[\s\S]+?Units<\/strong>[\s\S]+?<\/div>[\s\S]+?<\/div>/g,
  `
  <div className="form-group" style={{ gridColumn: 'span 2' }}>
    <label>Cart Items <span style={{ color: 'var(--color-danger)' }}>*</span></label>
    {cart.map((item, idx) => (
      <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '8px' }}>
         <strong style={{minWidth: '200px'}}>{item.medicine.name} (Max: {item.medicine.available_quantity})</strong>
         <input type="number" min="1" max={item.medicine.available_quantity} value={item.qty} 
           onChange={e => {
             const newCart = [...cart];
             newCart[idx].qty = parseInt(e.target.value) || 1;
             setCart(newCart);
           }}
           style={{ width: '100px' }}
         />
         <button className="btn btn-outline" onClick={() => setCart(cart.filter((_, i) => i !== idx))} style={{padding: '4px', fontSize: '11px', color: 'red'}}>Remove</button>
      </div>
    ))}
  </div>
  `
);

fs.writeFileSync('src/app/(dashboard)/sales/page.js', code);

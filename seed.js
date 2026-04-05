const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://spordklvizgjwwskqcxh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwb3Jka2x2aXpnand3c2txY3hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMzYwMDcsImV4cCI6MjA5MDkxMjAwN30.fDI-tvPUZZIfshGvmO0E4ncufvrvjWMl8z-4ZQ3_nfo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log("Seeding extensive dummy data...");

    // 1. Seed 10 Employees
    console.log("Seeding Employees...");
    const employeesToInsert = [
        { fname: 'David', lname: 'Miller', email: 'david.manager@pharmacare.com', password_hash: 'pass', gender: 'Male', salary: 75000 },
        { fname: 'Emma', lname: 'Watson', email: 'emma.staff@pharmacare.com', password_hash: 'pass', gender: 'Female', salary: 35000 },
        { fname: 'Liam', lname: 'Johnson', email: 'liam.staff@pharmacare.com', password_hash: 'pass', gender: 'Male', salary: 32000 },
        { fname: 'Olivia', lname: 'Brown', email: 'olivia.pharmacist@pharmacare.com', password_hash: 'pass', gender: 'Female', salary: 65000 },
        { fname: 'Noah', lname: 'Davis', email: 'noah.admin@pharmacare.com', password_hash: 'pass', gender: 'Male', salary: 85000 },
        { fname: 'Ava', lname: 'Wilson', email: 'ava.staff@pharmacare.com', password_hash: 'pass', gender: 'Female', salary: 36000 },
        { fname: 'William', lname: 'Taylor', email: 'william.staff@pharmacare.com', password_hash: 'pass', gender: 'Male', salary: 34000 },
        { fname: 'Sophia', lname: 'Moore', email: 'sophia.pharmacist@pharmacare.com', password_hash: 'pass', gender: 'Female', salary: 62000 }
    ];
    let { data: currEmps } = await supabase.from('employee').select('email');
    let empEmails = currEmps.map(e => e.email);
    for (const emp of employeesToInsert) {
        if (!empEmails.includes(emp.email)) {
            await supabase.from('employee').insert([{ ...emp, date_of_joining: new Date().toISOString().split('T')[0] }]);
        }
    }

    // 2. Add Addresses
    let { data: newEmps } = await supabase.from('employee').select('employee_id');
    for (const emp of newEmps) {
        await supabase.from('address').upsert({
            employee_id: emp.employee_id,
            street: '1' + Math.floor(Math.random() * 999) + ' Random Ave',
            stats: 'Kerala',
            city: ['Kochi', 'Trivandrum', 'Kozhikode', 'Thrissur'][Math.floor(Math.random()*4)],
            zip: '68' + Math.floor(Math.random() * 9000 + 1000)
        }, { onConflict: 'employee_id' });
    }

    // 3. Seed Suppliers
    console.log("Seeding Suppliers...");
    const suppliers = [
        { name: 'Sun Pharma Ltd', contact_number: '+91-1111111111', address: 'Mumbai, MH' },
        { name: 'Cipla Distributors', contact_number: '+91-2222222222', address: 'Bangalore, KA' },
        { name: 'Dr. Reddys Labs', contact_number: '+91-3333333333', address: 'Hyderabad, TS' },
        { name: 'Apollo Supply Co.', contact_number: '+91-4444444444', address: 'Chennai, TN' },
        { name: 'Lupin Wholesale', contact_number: '+91-5555555555', address: 'Kochi, KL' },
        { name: 'Torrent Distributors', contact_number: '+91-6666666666', address: 'Ahmedabad, GJ' },
        { name: 'Zydus Medica', contact_number: '+91-7777777777', address: 'Pune, MH' },
        { name: 'Glenmark Suppliers', contact_number: '+91-8888888888', address: 'Delhi, DL' }
    ];
    let { data: currSups } = await supabase.from('supplier').select('name');
    let supNames = currSups.map(s => s.name);
    for (const sup of suppliers) {
        if (!supNames.includes(sup.name)) await supabase.from('supplier').insert([sup]);
    }

    // 4. Seed Customers
    console.log("Seeding Customers...");
    const customers = [
        { name: 'Michael Scott', phone_number: '9123456780', address: 'Kochi Suburbs' },
        { name: 'Jim Halpert', phone_number: '9123456781', address: 'Trivandrum Heights' },
        { name: 'Pam Beesly', phone_number: '9123456782', address: 'MG Road Thrissur' },
        { name: 'Dwight Schrute', phone_number: '9123456783', address: 'Farm Road Kozhikode' },
        { name: 'Stanley Hudson', phone_number: '9123456784', address: 'Aluva' },
        { name: 'Kevin Malone', phone_number: '9123456785', address: 'Edappally' },
        { name: 'Angela Martin', phone_number: '9123456786', address: 'Palarivattom' },
        { name: 'Oscar Martinez', phone_number: '9123456787', address: 'Kadavanthra' },
        { name: 'Phyllis Vance', phone_number: '9123456788', address: 'Vyttila' },
        { name: 'Ryan Howard', phone_number: '9123456789', address: 'Fort Kochi' }
    ];
    let { data: currCusts } = await supabase.from('customer').select('phone_number');
    let custPhones = currCusts.map(c => c.phone_number);
    for (const cust of customers) {
        if (!custPhones.includes(cust.phone_number)) await supabase.from('customer').insert([cust]);
    }

    // 5. Seed 15 more Medicines
    console.log("Seeding Medicines...");
    const medsToInsert = [
        { name: 'Allegra 120mg', category: 'Antihistamine', batch_number: 'AL-001', expiry_date: '2027-01-01', price: 15.50, available_quantity: 120, min_threshold: 50, requires_prescription: false },
        { name: 'Cetirizine 10mg', category: 'Antihistamine', batch_number: 'AL-002', expiry_date: '2026-06-15', price: 10.00, available_quantity: 80, min_threshold: 50, requires_prescription: false },
        { name: 'Levocetirizine 5mg', category: 'Antihistamine', batch_number: 'AL-003', expiry_date: '2027-03-20', price: 18.00, available_quantity: 200, min_threshold: 50, requires_prescription: false },
        
        { name: 'Metformin 500mg', category: 'Anti-Diabetic', batch_number: 'AD-001', expiry_date: '2025-12-10', price: 40.00, available_quantity: 500, min_threshold: 50, requires_prescription: true },
        { name: 'Glimepiride 1mg', category: 'Anti-Diabetic', batch_number: 'AD-002', expiry_date: '2026-08-05', price: 35.00, available_quantity: 350, min_threshold: 50, requires_prescription: true },
        { name: 'Gliclazide 80mg', category: 'Anti-Diabetic', batch_number: 'AD-003', expiry_date: '2027-02-14', price: 50.00, available_quantity: 45, min_threshold: 50, requires_prescription: true }, // Low stock init
        
        { name: 'Amlodipine 5mg', category: 'Anti-Hypertensive', batch_number: 'AH-001', expiry_date: '2026-11-11', price: 25.00, available_quantity: 600, min_threshold: 50, requires_prescription: true },
        { name: 'Telmisartan 40mg', category: 'Anti-Hypertensive', batch_number: 'AH-002', expiry_date: '2027-05-30', price: 80.00, available_quantity: 250, min_threshold: 50, requires_prescription: true },
        { name: 'Losartan 50mg', category: 'Anti-Hypertensive', batch_number: 'AH-003', expiry_date: '2025-10-22', price: 65.00, available_quantity: 300, min_threshold: 50, requires_prescription: true },
        
        { name: 'Omeprazole 20mg', category: 'Antacid', batch_number: 'AN-001', expiry_date: '2026-04-18', price: 30.00, available_quantity: 150, min_threshold: 50, requires_prescription: false },
        { name: 'Pantoprazole 40mg', category: 'Antacid', batch_number: 'AN-002', expiry_date: '2027-09-09', price: 45.00, available_quantity: 110, min_threshold: 50, requires_prescription: false },
        { name: 'Rabeprazole 20mg', category: 'Antacid', batch_number: 'AN-003', expiry_date: '2026-12-01', price: 55.00, available_quantity: 40, min_threshold: 50, requires_prescription: false }, // Low stock init
        
        { name: 'Azithromycin 500mg', category: 'Antibiotic', batch_number: 'AB-001', expiry_date: '2026-07-25', price: 110.00, available_quantity: 80, min_threshold: 50, requires_prescription: true },
        { name: 'Ciprofloxacin 500mg', category: 'Antibiotic', batch_number: 'AB-002', expiry_date: '2025-09-15', price: 90.00, available_quantity: 140, min_threshold: 50, requires_prescription: true },
        { name: 'Levofloxacin 500mg', category: 'Antibiotic', batch_number: 'AB-003', expiry_date: '2027-11-20', price: 105.00, available_quantity: 130, min_threshold: 50, requires_prescription: true }
    ];

    let { data: currMeds } = await supabase.from('medicine').select('name');
    let medNames = currMeds.map(m => m.name);
    let toInsert = medsToInsert.filter(m => !medNames.includes(m.name));
    
    if (toInsert.length > 0) {
        const { data: newDbMeds, error: insErr } = await supabase.from('medicine').insert(toInsert).select('*');
        if (!insErr && newDbMeds) {
            console.log("Adding substitutes for new meds...");
            // Example map: Omeprazole <-> Pantoprazole <-> Rabeprazole
            const ome = newDbMeds.find(m => m.name === 'Omeprazole 20mg')?.medicine_id;
            const pan = newDbMeds.find(m => m.name === 'Pantoprazole 40mg')?.medicine_id;
            const rab = newDbMeds.find(m => m.name === 'Rabeprazole 20mg')?.medicine_id;
            
            const aml = newDbMeds.find(m => m.name === 'Amlodipine 5mg')?.medicine_id;
            const tel = newDbMeds.find(m => m.name === 'Telmisartan 40mg')?.medicine_id;
            const los = newDbMeds.find(m => m.name === 'Losartan 50mg')?.medicine_id;

            const allg = newDbMeds.find(m => m.name === 'Allegra 120mg')?.medicine_id;
            const cet = newDbMeds.find(m => m.name === 'Cetirizine 10mg')?.medicine_id;
            const lev = newDbMeds.find(m => m.name === 'Levocetirizine 5mg')?.medicine_id;

            let subs = [];
            const addSub = (m1, m2) => {
                if (m1 && m2) subs.push({ medicine_id: m1, substitute_medicine_id: m2 }, { medicine_id: m2, substitute_medicine_id: m1 });
            };
            
            addSub(ome, pan); addSub(pan, rab); addSub(ome, rab);
            addSub(aml, tel); addSub(tel, los); addSub(aml, los);
            addSub(allg, cet); addSub(cet, lev); addSub(allg, lev);

            if (subs.length > 0) {
                await supabase.from('is_substitute').insert(subs);
            }
        }
    }

    // 6. Generate Dummy Sales
    console.log("Generating initial sales to populate dashboard...");
    let { data: finalMeds } = await supabase.from('medicine').select('*');
    let { data: finalCusts } = await supabase.from('customer').select('*');
    let { data: finalEmps } = await supabase.from('employee').select('*');
    let { data: finalSales } = await supabase.from('sales').select('sale_id');
    
    // Only generate dummy sales if we don't have many
    if (finalSales && finalSales.length === 0 && finalMeds.length > 5 && finalCusts.length > 5) {
        for (let i = 0; i < 15; i++) {
            const randCust = finalCusts[Math.floor(Math.random() * finalCusts.length)];
            const randEmp = finalEmps[Math.floor(Math.random() * finalEmps.length)];
            
            // Generate a date within the last 7 days to show up on the ReCharts dashboard!
            const d = new Date();
            d.setDate(d.getDate() - Math.floor(Math.random() * 7));
            
            // Randomly select 1 to 3 items
            const numItems = Math.floor(Math.random() * 3) + 1;
            let cart = [];
            let totalAmount = 0;
            for(let j=0; j<numItems; j++) {
               const randMed = finalMeds[Math.floor(Math.random() * finalMeds.length)];
               const qty = Math.floor(Math.random() * 3) + 1;
               totalAmount += randMed.price * qty;
               cart.push({ m_id: randMed.medicine_id, q: qty });
            }

            const { data: newSale } = await supabase.from('sales').insert([{
                customer_id: randCust.customer_id,
                employee_id: randEmp.employee_id,
                sale_date: d.toISOString().split('T')[0],
                total_amount: totalAmount
            }]).select();

            if (newSale && newSale[0]) {
                const sId = newSale[0].sale_id;
                let incs = cart.map(c => ({ sale_id: sId, medicine_id: c.m_id, quantity: c.q }));
                await supabase.from('includes').insert(incs);
            }
        }
    }

    console.log("Seeding fully complete.");
}

seed();

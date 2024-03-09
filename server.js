const express = require('express');
const bodyParser = require('body-parser');
const retrieve = require('./retrieve');
const pool = require('./src/config/db_connection')
const { TABLE_NAME, PRIMARY, SECONDARY } = require('./src/config/constants');

const app = express();
const port = process.env.PORT || 3000;

require('dotenv').config();

app.use(bodyParser.json());

app.post('/identify', async (req, res) => {
    try {
        const { email, phoneNumber } = req.body;
        const { linkedId, id } = await identifyCustomer(email, phoneNumber);
        let ans = await retrieve(linkedId, id);
        res.json(ans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error identifying customer' });
    }
});

// Function to handle customer identification based on phone number
const getPhoneNumberEntry = async (phone_number) => {
    const [phone] = await pool.query(`
        SELECT * FROM ${TABLE_NAME} 
        WHERE phone_number = ?;`, [phone_number]);
    return phone.length >= 1 ? phone[0] : null;
};

// Function to insert a new customer with email
const insertNewCustomerWithEmail = async (email) => {
    const res = await pool.query(`
        INSERT INTO ${TABLE_NAME} (email, link_precedence)
        VALUES (?, ?);`, [email, PRIMARY]);
    return { linkedId: res.linked_id, id: res.id };
};

// Function to insert a new customer with phone number
const insertNewCustomerWithPhoneNumber = async (phone_number) => {
    const res = await pool.query(`
        INSERT INTO ${TABLE_NAME} (phone_number, link_precedence)
        VALUES (?, ?);`, [phone_number, PRIMARY]);
    return { linkedId: res.linkedId, id: res.id };
};

let handleMatch = async (phone_number, email) => {
    let result = {};
    let tempPhoneNumber, tempEmail;
    
    [tempPhoneNumber] = await pool.query(`
        SELECT * FROM ${TABLE_NAME} 
        WHERE phone_number = ?;
    `, [phone_number]);

    [tempEmail] = await pool.query(`
        SELECT * FROM ${TABLE_NAME} 
        WHERE email = ?;
    `, [email]);

    const entryFromPhoneNumber = tempPhoneNumber.length >= 1 ? tempPhoneNumber[0] : null;
    const entryFromEmail = tempEmail.length >= 1 ? tempEmail[0] : null;

    if (entryFromPhoneNumber != null && entryFromEmail != null) {
        if ((entryFromPhoneNumber != entryFromEmail)
            && (entryFromEmail.link_precedence === PRIMARY)
            && (entryFromPhoneNumber.link_precedence === PRIMARY)) {

            const newerEntry = entryFromPhoneNumber.created_at > entryFromEmail.created_at
                ? entryFromPhoneNumber : entryFromEmail;

            // Update the newer entry to be secondary
            await pool.query(`
            UPDATE ${TABLE_NAME} 
            SET link_precedence = ?
            WHERE id = ?;`, [SECONDARY, newerEntry.id]);
        
            result.linkedId = newerEntry.linkedId;
            result.id = newerEntry.id;
        }else{
            result.linkedId = entryFromPhoneNumber.linkedId;
            result.id = entryFromPhoneNumber.id;
        }
    } else if (!entryFromPhoneNumber && entryFromEmail) {

        let res = await pool.query(`
        INSERT INTO ${TABLE_NAME} (phone_number, link_precedence, linked_id)
        VALUES (?, ?, ?);`
            , [phone_number, SECONDARY, entryFromEmail.id]);

        result.linkedId = res.linkedId;
        result.id = res.id;

    } else if (entryFromPhoneNumber && !entryFromEmail) {

        let res = await pool.query(`
        INSERT INTO ${TABLE_NAME} (email, link_precedence, linked_id)
        VALUES (?, ?, ?);`
            , [email, SECONDARY, entryFromPhoneNumber.id]);

        result.linkedId = res.linkedId;
        result.id = res.id;
    } else {
        let res = await pool.query(`
        INSERT INTO ${TABLE_NAME} (email, phone_number, link_precedence)
        VALUES (?, ?, ?);`
            , [email, phone_number, PRIMARY]);

        result.linkedId = res.linkedId;
        result.id = res.id;
    }

    return {
        linkedId: result.linkedId,
        id: result.id
    };
}
let ifPresent = (variable) => {
    return !(typeof variable === 'undefined' || variable === null || variable === 'null');
}
// Function to handle identification based on email and phone number
const  identifyCustomer = async (email, phone_number) => {
    let linkedId, id; 

    if (ifPresent(phone_number) && ifPresent(email)) {
        const result = await handleMatch(phone_number, email);
        linkedId = result.linkedId;
        id = result.id;
    } else if (!ifPresent(phone_number) && ifPresent(email)) {
        const emailEntry = await getEmailEntry(email);
        if (!emailEntry) {
            const res = await insertNewCustomerWithEmail(email);
            linkedId = res.linkedId;
            id = res.id;
        } else {
            linkedId = emailEntry.linked_id;
            id = emailEntry.id;
        }
    } else if (ifPresent(phone_number) && !ifPresent(email)) {
        const phoneNumberEntry = await getPhoneNumberEntry(phone_number);
        if (!phoneNumberEntry) {
            const res = await insertNewCustomerWithPhoneNumber(phone_number);
            linkedId = res.linkedId;
            id = res.id;
        } else {
            linkedId = phoneNumberEntry.linked_id;
            id = phoneNumberEntry.id;
        }
    } else {
        throw new Error('No Parameters found or Valid !');
    }

    return { linkedId, id };
};

// Function to handle customer identification based on email
const getEmailEntry = async (email) => {
    const [email_] = await pool.query(`
        SELECT * FROM ${TABLE_NAME} 
        WHERE email = ?;`, [email]);
    return email_.length === 1 ? email_[0] : null;
};

app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
});

const pool = require('../config/db_connection');
const {
    TABLE_NAME,
    PRIMARY
} = require('../config/constants')
const connection = require('../config/db_connection')

const getEmailEntry = async (email) => {
    const [email_] = await pool.query(`
        SELECT * FROM ${TABLE_NAME} 
        WHERE email = ?;`, [email]);
    return email_.length === 1 ? email_[0] : null;
};
const queryLinkedContacts = async (parentId) => {
    return await connection.query(`SELECT * FROM ${TABLE_NAME} WHERE linked_id = ?`, parentId);    
};

const getPhoneNumberEntry = async (phone_number) => {
    const [phone] = await pool.query(`
        SELECT * FROM ${TABLE_NAME} 
        WHERE phone_number = ?;`, [phone_number]);
    return phone.length >= 1 ? phone[0] : null;
};

const insertNewCustomerWithEmail = async (email) => {
    const res = await pool.query(`
        INSERT INTO ${TABLE_NAME} (email, link_precedence)
        VALUES (?, ?);`, [email, PRIMARY]);
    return { linkedId: res.linked_id, id: res.id };
};

const insertNewCustomerWithPhoneNumber = async (phone_number) => {
    const res = await pool.query(`
        INSERT INTO ${TABLE_NAME} (phone_number, link_precedence)
        VALUES (?, ?);`, [phone_number, PRIMARY]);
    return { linkedId: res.linkedId, id: res.id };
};
module.exports = {
    getEmailEntry,
    queryLinkedContacts,
    getPhoneNumberEntry,
    insertNewCustomerWithEmail,
    insertNewCustomerWithPhoneNumber,
}
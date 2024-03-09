const { TABLE_NAME, PRIMARY, SECONDARY } = require('../config/constants')
const connection = require('../config/db_connection')

const traverseUpwards = async (linkedId, id) => {
    let currentLinkedId = linkedId;
    let currentNodeId = id;

    // Traverse upwards until the primary node is found
    while (currentLinkedId) {
        try {
            const query = `SELECT * FROM ${TABLE_NAME} WHERE id = ?`;
            const [parentNode] = await connection.query(query, currentLinkedId);

            if (!parentNode || parentNode.length === 0) {
                throw new Error('Primary node not found');
            }

            currentLinkedId = parentNode[0].linked_id;
            currentNodeId = parentNode[0].id;
        } catch (error) {
            console.error('Error traversing upwards:', error);
            throw new Error('An error occurred while traversing upwards');
        }
    }
    try {
        const result = await connection.query(`SELECT * FROM ${TABLE_NAME} WHERE id = ?`, currentNodeId);
        return result[0];
    } catch (error) {
        console.error('Error retrieving current node:', error);
        throw new Error('An error occurred while retrieving current node');
    }
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
        } else {
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
module.exports = {
    traverseUpwards,
    handleMatch,
    ifPresent
}
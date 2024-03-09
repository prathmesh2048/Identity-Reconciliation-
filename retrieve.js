const connection = require('./src/config/db_connection');
const { TABLE_NAME, PRIMARY, SECONDARY } = require('./src/config/constants');

const queryLinkedContacts = async (parentId) => {
    return await connection.query(`SELECT * FROM ${TABLE_NAME} WHERE linked_id = ?`, parentId);    
};

const traverseUpwards = async (linkedId, id) => {
    let currentLinkedId = linkedId;
    let currentNodeId = id;
    
    // Traverse upwards until the primary node is found
    while (currentLinkedId) {
        try {
            const query = `SELECT * FROM ${TABLE_NAME} WHERE id = (SELECT linked_id FROM ${TABLE_NAME} WHERE linked_id = ?)`;
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

const retrieve = async (linkedId, id) => {
    try {
        // Traverse upwards to find the primary node
        const primaryNode = await traverseUpwards(linkedId, id);
        console.log(`$$$$$$$$$$$$${primaryNode}`)
        const stack = [primaryNode[0].id]; // Start traversal from the primary node
        const result = {
            contact: {
                primaryContactId: primaryNode[0].id,
                emails: [primaryNode[0].email],
                phoneNumbers: [primaryNode[0].phone_number],
                secondaryContactIds: []
            }
        };

        // Process stack elements until it's empty
        while (stack.length > 0) {
            const parentId = stack.pop();

            // Query and push linked contacts onto stack
            const linkedContacts = await queryLinkedContacts(parentId);
            for (const contact of linkedContacts[0]) {
                stack.push(contact.id);

                result.contact.emails.push(contact.email);
                result.contact.phoneNumbers.push(contact.phone_number);
                result.contact.secondaryContactIds.push(contact.id);
            }
        }
        return result;
    } catch (error) {
        console.error('Error retrieving subtree:', error);
        throw new Error('An error occurred while retrieving subtree');
    }
};

module.exports = retrieve;

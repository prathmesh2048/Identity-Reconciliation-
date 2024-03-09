const {traverseUpwards, handleMatch, ifPresent} = require('../utils/utils')

const {
    getEmailEntry,
    queryLinkedContacts,
    getPhoneNumberEntry,
    insertNewCustomerWithEmail,
    insertNewCustomerWithPhoneNumber,

} = require('../models/model')

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

const retrieve = async (linkedId, id) => {
    try {
        // Traverse upwards to find the primary node
        const primaryNode = await traverseUpwards(linkedId, id);
        console.log(`$$$$$$$$$$$$${primaryNode}`)
        const stack = [primaryNode[0].id];
        const result = {
            contact: {
                primaryContactId: primaryNode[0].id,
                emails: [primaryNode[0].email],
                phoneNumbers: [primaryNode[0].phone_number],
                secondaryContactIds: []
            }
        };

        while (stack.length > 0) {
            const parentId = stack.pop();
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


module.exports = {
    identifyCustomer,
    retrieve
};
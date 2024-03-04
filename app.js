
const http = require('http');
const fs = require('fs');
const qs = require('querystring');
const url = require('url');
const { v4: uuidv4 } = require('uuid');

const PORT = 3001;
const jsonFilePath = './user.json';

let jsonData = JSON.parse(fs.readFileSync('./user.json','utf-8'))

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    if (req.method === 'GET' && req.url === '/') {
        const pageContent = fs.readFileSync('./index.html', 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(pageContent);
        res.end();
    } else if (req.method === 'POST' && req.url === '/submit') {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const formData = qs.parse(body);
            const excludedFields = ['submit', 'submitbtn'];
            for (const field of excludedFields) {
                delete formData[field];
            }
            formData.userId = uuidv4();

            fs.readFile(jsonFilePath, 'utf-8', (readErr, data) => {
                if (readErr) {
                    
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.write('Internal Server Error');
                    res.end();
                    return;
                }
                jsonData = JSON.parse(data);
                jsonData.push(formData);
                fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2), (writeErr) => {
                    if (writeErr) {
                        console.error('Error writing JSON file:', writeErr);
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.write('Internal Server Error');
                        res.end();
                        return;
                    }
                    console.log('Form data appended to ' + jsonFilePath);
                    res.writeHead(302, { 'Location': '/table.html' });  
                    res.end();
                });
            });
        });
    } else if (req.method === 'GET' && parsedUrl.pathname === '/table.html') {
        const pageContent = fs.readFileSync('./table.html', 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(pageContent);
        res.end();
    } else if (req.method === 'GET' && parsedUrl.pathname === '/getUsers') {
        fs.readFile(jsonFilePath, 'utf-8', (err, data) => {
            if (err) {
                console.error('Error reading JSON file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.write('Internal Server Error');
                res.end();
                return;
            }
            jsonData = JSON.parse(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.write(JSON.stringify(jsonData));
            res.end();
        });
    } else if (req.method === 'DELETE' && parsedUrl.pathname === '/deleteUser') {
        const userIdToDelete = parsedUrl.query.userId;
        fs.readFile(jsonFilePath, 'utf-8', (err, data) => {
            if (err) {
                console.error('Error reading JSON file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.write('Internal Server Error');
                res.end();
                return;
            }
            jsonData = JSON.parse(data);
            const userIndex = jsonData.findIndex((user) => user.userId === userIdToDelete);
            if (userIndex !== -1) {
                const deletedUser = jsonData.splice(userIndex, 1)[0];
                fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2), (writeErr) => {
                    if (writeErr) {
                        console.error('Error writing JSON file:', writeErr);
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.write('Internal Server Error');
                        res.end();
                        return;
                    }
                    console.log('User deleted:', userIdToDelete);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.write(JSON.stringify({ success: true }));
                    res.end();
                });
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.write(JSON.stringify({ success: false, error: 'User not found' }));
                res.end();
            }
        });
    } else if (req.method === 'GET' && parsedUrl.pathname === '/editUser') {
        const userIdToEdit = parsedUrl.query.userId;
        fs.readFile('./edit.html', 'utf-8', (err, editFormPage) => {
            if (err) {
                console.error('Error reading edit form file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.write('Internal Server Error');
                res.end();
                return;
            }
            

            fs.readFile(jsonFilePath, 'utf-8', (readErr, data) => {
                if (readErr) {
                    console.error('Error reading JSON file:', readErr);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.write('Internal Server Error');
                    res.end();
                    return;
                }

                try {
                    const jsonData = JSON.parse(data);
                    const userToEdit = jsonData.find((user) => user.userId === userIdToEdit);

                    if (!userToEdit) {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.write('404 Not Found');
                        res.end();
                        return;
                    }

                    const modifiedEditPage = editFormPage
                    .replace('id="editUserId"', `id="editUserId" value="${userToEdit.userId}"`)
                    .replace('id="editName"',`id="editName" value="${userToEdit.username}"`)
                    .replace('id="editEmail"',`id="editEmail" value="${userToEdit.email}" `)
                    .replace('id="editPhone"',`id="editPhone" value="${userToEdit.phoneNumber}"`)
                    .replace('id="editPassword"',`id="editPassword" value="${userToEdit.password}"`)

                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.write(modifiedEditPage);
                    res.end();
                } catch (parseError) {
                    console.error('Error parsing JSON data:', parseError);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.write('Internal Server Error');
                    res.end();
                }
            });
        });
    } else if (req.method === 'POST' && req.url === '/updateUser') {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
        });
        req.on('end', () => {
            const formData = new URLSearchParams(body);
    
            const userIdToUpdate = formData.get("userId");
            const userToEditIndex = jsonData.findIndex((user) => user.userId === userIdToUpdate);
    
            if (userToEditIndex !== -1) {
                jsonData[userToEditIndex].username = formData.get("name");
                jsonData[userToEditIndex].email = formData.get("email");
                jsonData[userToEditIndex].phoneNumber = formData.get("phoneNumber");
                jsonData[userToEditIndex].password = formData.get("password");
    
                fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2), (writeErr) => {
                    if (writeErr) {
                        console.error('Error writing JSON file:', writeErr);
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.write('Internal Server Error');
                        res.end();
                        return;
                    }
    
                    console.log('User details updated:', userIdToUpdate);
    
                    res.writeHead(302, { 'Location': '/table.html' });
                    res.end();
                });
            } else {
                console.log('User not found for ID:', userIdToUpdate);
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.write(JSON.stringify({ success: false, error: 'User not found' }));
                res.end();
            }
        });
    }
    
    else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.write('404 Not Found');
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
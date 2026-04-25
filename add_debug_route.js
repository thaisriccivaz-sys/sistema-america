const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const target = `app.get('/api/version', (req, res) => res.json({ version: 'V47_DIAGNOSIS' }));`;
const repl = `app.get('/api/version', (req, res) => res.json({ version: 'V47_DIAGNOSIS' }));
app.get('/api/debug-routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach(middleware => {
        if (middleware.route) { // routes registered directly on the app
            routes.push(middleware.route.path);
        } else if (middleware.name === 'router') { // router middleware 
            middleware.handle.stack.forEach(handler => {
                let route;
                route = handler.route;
                route && routes.push(route.path);
            });
        }
    });
    res.json(routes);
});`;

js = js.replace(target, repl);
fs.writeFileSync('backend/server.js', js, 'utf8');

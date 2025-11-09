// Express initialization
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Built-in middleware to parse JSON bodies
app.use(express.json());


// Custom Request Logging Middleware 
function requestLogger(req, res, next) {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] ${req.method} ${req.originalUrl}`;

  if (req.method === "POST" || req.method === "PUT") {
    console.log(`${base} | body: ${JSON.stringify(req.body)}`);
  } else {
    console.log(base);
  }

  next();
}

// Register middleware for all routes
app.use(requestLogger);
// Input Validation Middleware
const { body, validationResult } = require("express-validator");

const allowedCategories = ["appetizer", "entree", "dessert", "beverage"];

const menuItemRules = [
  body("name")
    .exists().withMessage("Name is required")
    .bail()
    .isString().withMessage("Name must be a string")
    .bail()
    .trim()
    .isLength({ min: 3 }).withMessage("Name must be at least 3 characters long"),

  body("description")
    .exists().withMessage("Description is required")
    .bail()
    .isString().withMessage("Description must be a string")
    .bail()
    .trim()
    .isLength({ min: 10 }).withMessage("Description must be at least 10 characters long"),

  body("price")
    .exists().withMessage("Price is required")
    .bail()
    .isFloat({ gt: 0 }).withMessage("Price must be a number greater than 0")
    .toFloat(),

  body("category")
    .exists().withMessage("Category is required")
    .bail()
    .isIn(allowedCategories)
    .withMessage(`Category must be one of: ${allowedCategories.join(", ")}`),

  body("ingredients")
    .exists().withMessage("Ingredients are required")
    .bail()
    .isArray({ min: 1 }).withMessage("Ingredients must be an array with at least 1 ingredient"),

  body("available")
    .optional()
    .isBoolean().withMessage("Available must be a boolean")
    .toBoolean()
];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const details = errors.array().map(err => ({
    field: err.path,
    message: err.msg
  }));
  return res.status(400).json({
    status: 400,
    error: "ValidationError",
    message: "Invalid request body",
    details
  });
}



// Data for the server
const menuItems = [
  {
    id: 1,
    name: "Classic Burger",
    description: "Beef patty with lettuce, tomato, and cheese on a sesame seed bun",
    price: 12.99,
    category: "entree",
    ingredients: ["beef", "lettuce", "tomato", "cheese", "bun"],
    available: true
  },
  {
    id: 2,
    name: "Chicken Caesar Salad",
    description: "Grilled chicken breast over romaine lettuce with parmesan and croutons",
    price: 11.50,
    category: "entree",
    ingredients: ["chicken", "romaine lettuce", "parmesan cheese", "croutons", "caesar dressing"],
    available: true
  },
  {
    id: 3,
    name: "Mozzarella Sticks",
    description: "Crispy breaded mozzarella served with marinara sauce",
    price: 8.99,
    category: "appetizer",
    ingredients: ["mozzarella cheese", "breadcrumbs", "marinara sauce"],
    available: true
  },
  {
    id: 4,
    name: "Chocolate Lava Cake",
    description: "Warm chocolate cake with molten center, served with vanilla ice cream",
    price: 7.99,
    category: "dessert",
    ingredients: ["chocolate", "flour", "eggs", "butter", "vanilla ice cream"],
    available: true
  },
  {
    id: 5,
    name: "Fresh Lemonade",
    description: "House-made lemonade with fresh lemons and mint",
    price: 3.99,
    category: "beverage",
    ingredients: ["lemons", "sugar", "water", "mint"],
    available: true
  },
  {
    id: 6,
    name: "Fish and Chips",
    description: "Beer-battered cod with seasoned fries and coleslaw",
    price: 14.99,
    category: "entree",
    ingredients: ["cod", "beer batter", "potatoes", "coleslaw", "tartar sauce"],
    available: false
  }
];


// CRUD endpoints for /api/menu 

// GET /api/menu - Retrieve all menu items
app.get("/api/menu", (req, res) => {
  res.status(200).json(menuItems);
});

// GET /api/menu/:id - Retrieve a specific menu item by ID
app.get("/api/menu/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const item = menuItems.find(m => m.id === id);
  if (!item) {
    return res.status(404).json({ message: "Menu item not found" });
  }
  res.status(200).json(item);
});

// POST /api/menu - Add a new menu item
app.post("/api/menu", menuItemRules, validate, (req, res) => {
  const newItem = {
    id: menuItems.length ? Math.max(...menuItems.map(i => i.id)) + 1 : 1,
    name: req.body.name,
    description: req.body.description,
    price: req.body.price,
    category: req.body.category,
    ingredients: req.body.ingredients,
    available: req.body.available ?? true
  };
  menuItems.push(newItem);
  res.status(201).json(newItem);
});

// PUT /api/menu/:id - Update an existing menu item
app.put("/api/menu/:id", menuItemRules, validate, (req, res) => {
  const id = parseInt(req.params.id);
  const index = menuItems.findIndex(i => i.id === id);
  if (index === -1) {
    return res.status(404).json({ message: "Menu item not found" });
  }
  menuItems[index] = { ...menuItems[index], ...req.body };
  res.status(200).json(menuItems[index]);
});

// DELETE /api/menu/:id - Remove a menu item
app.delete("/api/menu/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = menuItems.findIndex(i => i.id === id);
  if (index === -1) {
    return res.status(404).json({ message: "Menu item not found" });
  }
  menuItems.splice(index, 1);
  res.status(200).json({ message: "Menu item deleted" });
});


// Centralized error handler
app.use((err, req, res, next) => {
  // Your logger already prints requests; log errors too:
  console.error("Unhandled error:", err);

  if (res.headersSent) return next(err);
  const status = err.status || 500;

  return res.status(status).json({
    status,
    error: err.name || "InternalServerError",
    message: err.message || "Something went wrong"
  });
});


// 404 for unknown routes
app.use((req, res) => {
  return res.status(404).json({
    status: 404,
    error: "NotFound",
    message: `Route ${req.method} ${req.originalUrl} does not exist`
  });
});


// Simple test route to confirm the server works
app.get("/", (req, res) => {
  res.send("Tasty Bites API is running!");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


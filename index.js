import express from "express";
import { sql } from "@vercel/postgres";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// __dirnameの代替を設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ビューエンジンの設定
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

// ECサイトのルーティング
app.get("/", async (req, res) => {
    let errorMessage = "";
    let products = [];

    try {
        const data = await sql`
            SELECT * FROM products ORDER BY id DESC;
        `;

        products = data.rows;
    } catch (error) {
        errorMessage = error.message;
    }

    res.render("index.ejs", { products: products, errorMessage: errorMessage });
});

app.get("/thanks", async (req, res) => {
    let products = [];

    try {
        const data = await sql`
            SELECT * FROM products ORDER BY id DESC LIMIT 3;
        `;

        products = data.rows;
    } catch (error) {
        console.log(error.message);
    }
    res.render("thanks.ejs", { products: products });
});

app.get("/:id", async (req, res) => {
    let errorMessage = "";
    let product = {};

    try {
        const data = await sql`
            SELECT * FROM products WHERE id = ${req.params.id};;
        `;

        if (data.rows.length === 0) {
            throw new Error("商品が見つかりませんでした");
        }

        product = data.rows[0];
    } catch (error) {
        errorMessage = error.message;
    }

    res.render("detail.ejs", { product: product, errorMessage: errorMessage });
});

app.post("/order", async (req, res) => {
    const { product_id } = req.body;
    const quantity = 1;

    try {
        await sql`BEGIN`;

        await sql`
            UPDATE products
            SET stock = stock - ${quantity} 
            WHERE id = ${product_id};
        `;

        await sql`
            INSERT INTO orders (product_id, quantity, order_date) 
            VALUES (${product_id}, ${quantity}, NOW());
        `;

        await sql`COMMIT`;

        res.redirect("/thanks");
    } catch (error) {
        await sql`ROLLBACK;`;
        res.render("error.ejs", {
            errorMessage: error.message,
            link_url: `/${product_id}`,
            page_name: "商品ページ",
        });
    }
});

// 商品管理画面のルーティング
app.get("/admin/products", async (req, res) => {
    let errorMessage = "";
    let products = [];

    try {
        const data = await sql`
            SELECT * FROM products ORDER BY id DESC;
        `;

        products = data.rows;
    } catch (error) {
        errorMessage = error.message;
    }

    res.render("admin/products/index.ejs", {
        products: products,
        errorMessage: errorMessage,
    });
});

app.get("/admin/products/new", async (req, res) => {
    res.render("admin/products/new.ejs");
});

app.post("/admin/products/create", async (req, res) => {
    const { name, price, image_url, stock, description } = req.body;

    const formattedPrice = price === "" ? null : price;
    const formattedImageUrl = image_url === "" ? null : image_url;
    const formattedStock = stock === "" ? null : stock;
    const formattedDescription = description === "" ? null : description;

    try {
        await sql`
            INSERT INTO products (name, price, image_url, stock, description)
            VALUES (${name}, ${formattedPrice}, ${formattedImageUrl}, ${formattedStock}, ${formattedDescription});
        `;

        res.redirect("/admin/products");
    } catch (error) {
        res.render("error.ejs", {
            errorMessage: error.message,
            link_url: "/admin/products/new",
            page_name: "商品追加ページ",
        });
    }
});

app.get("/admin/products/edit/:id", async (req, res) => {
    let errorMessage = "";
    let product = {};

    try {
        const data = await sql`
            SELECT * FROM products WHERE id = ${req.params.id};
        `;

        if (data.rows.length === 0) {
            throw new Error("商品が見つかりませんでした");
        }

        product = data.rows[0];
    } catch (error) {
        errorMessage = error.message;
    }

    res.render("admin/products/edit.ejs", {
        product: product,
        errorMessage: errorMessage,
    });
});

app.post("/admin/products/update/:id", async (req, res) => {
    const { name, price, image_url, stock, description } = req.body;

    const formattedPrice = price === "" ? null : price;
    const formattedImageUrl = image_url === "" ? null : image_url;
    const formattedStock = stock === "" ? null : stock;
    const formattedDescription = description === "" ? null : description;

    try {
        await sql`
            UPDATE products
            SET name = ${name}, price = ${formattedPrice}, image_url = ${formattedImageUrl}, stock = ${formattedStock}, description = ${formattedDescription}
            WHERE id = ${req.params.id};
        `;

        res.redirect("/admin/products/");
    } catch (error) {
        res.render("error.ejs", {
            errorMessage: error.message,
            link_url: `/admin/products/edit/${req.params.id}`,
            page_name: "商品更新ページ",
        });
    }
});

// 注文管理画面のルーティング
app.get("/admin/orders", async (req, res) => {
    let errorMessage = "";
    let orders = [];

    try {
        const data = await sql`
            SELECT orders.id, products.name, orders.quantity FROM orders JOIN products ON orders.product_id = products.id ORDER BY orders.id DESC;
        `;

        orders = data.rows;
    } catch (error) {
        errorMessage = error.message;
    }

    res.render("admin/orders/index.ejs", {
        orders: orders,
        errorMessage: errorMessage,
    });
});

app.get("/admin/orders/:id", async (req, res) => {
    let errorMessage = "";
    let order = {};

    try {
        const data = await sql`
            SELECT orders.id, products.name, orders.quantity, products.price, products.image_url, orders.order_date FROM orders JOIN products ON orders.product_id = products.id WHERE orders.id = ${req.params.id};
        `;

        if (data.rows.length === 0) {
            throw new Error("注文が見つかりませんでした");
        }

        order = data.rows[0];
    } catch (error) {
        errorMessage = error.message;
    }

    res.render("admin/orders/show.ejs", {
        order: order,
        errorMessage: errorMessage,
    });
});

app.listen(3000);

export default app;

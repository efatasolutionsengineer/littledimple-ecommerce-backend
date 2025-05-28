// db/migrations/20250411_create_all_tables.js
exports.up = async function(knex) {
    await knex.schema.createTable('Users', (table) => {
      table.increments('id').primary();
      table.string('username', 50).notNullable().unique();
      table.string('email', 100).notNullable().unique();
      table.string('password', 255).notNullable();
      table.string('full_name', 100);
      table.string('phone', 20);
      table.text('address');
      table.enu('role', ['customer', 'admin']).defaultTo('customer');
      table.timestamps(true, true);
    });
  
    await knex.schema.createTable('Categories', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.text('description');
    });
  
    await knex.schema.createTable('Products', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.text('description');
      table.decimal('price', 10, 2).notNullable();
      table.integer('stock').notNullable().defaultTo(0);
      table.integer('category_id').references('id').inTable('Categories').onDelete('SET NULL');
      table.string('image_url', 255);
      table.timestamps(true, true);
    });
  
    await knex.schema.createTable('Orders', (table) => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('Users').onDelete('CASCADE');
      table.decimal('total_price', 10, 2).notNullable();
      table.enu('status', ['pending', 'paid', 'shipped', 'delivered', 'canceled']).defaultTo('pending');
      table.timestamp('order_date').defaultTo(knex.fn.now());
      table.text('shipping_address');
    });
  
    await knex.schema.createTable('Order_Details', (table) => {
      table.increments('id').primary();
      table.integer('order_id').references('id').inTable('Orders').onDelete('CASCADE');
      table.integer('product_id').references('id').inTable('Products').onDelete('CASCADE');
      table.integer('quantity').notNullable();
      table.decimal('price', 10, 2).notNullable();
    });
  
    await knex.schema.createTable('Cart', (table) => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('Users').onDelete('CASCADE');
      table.integer('product_id').references('id').inTable('Products').onDelete('CASCADE');
      table.integer('quantity').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  
    await knex.schema.createTable('Payments', (table) => {
      table.increments('id').primary();
      table.integer('order_id').references('id').inTable('Orders').onDelete('CASCADE');
      table.enu('payment_method', ['credit_card', 'bank_transfer', 'paypal', 'cash_on_delivery']).notNullable();
      table.decimal('amount', 10, 2).notNullable();
      table.enu('payment_status', ['pending', 'completed', 'failed', 'refunded']).defaultTo('pending');
      table.timestamp('payment_date').defaultTo(knex.fn.now());
    });
  
    await knex.schema.createTable('Shipping', (table) => {
      table.increments('id').primary();
      table.integer('order_id').references('id').inTable('Orders').onDelete('CASCADE');
      table.enu('shipping_method', ['standard', 'express', 'overnight']).notNullable();
      table.decimal('shipping_cost', 10, 2).notNullable();
      table.enu('shipping_status', ['pending', 'shipped', 'in_transit', 'delivered']).defaultTo('pending');
      table.timestamp('shipping_date').defaultTo(knex.fn.now());
    });
  
    await knex.schema.createTable('Reviews', (table) => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('Users').onDelete('CASCADE');
      table.integer('product_id').references('id').inTable('Products').onDelete('CASCADE');
      table.integer('rating').notNullable();
      table.text('review');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  
    await knex.schema.createTable('Wishlists', (table) => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('Users').onDelete('CASCADE');
      table.integer('product_id').references('id').inTable('Products').onDelete('CASCADE');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  
    await knex.schema.createTable('Admins', (table) => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('Users').onDelete('CASCADE');
      table.enu('admin_role', ['super_admin', 'manager', 'staff']).defaultTo('staff');
    });
  
    await knex.schema.createTable('Coupons', (table) => {
      table.increments('id').primary();
      table.string('code', 50).notNullable().unique();
      table.integer('discount_percentage').notNullable();
      table.date('valid_from');
      table.date('valid_until');
      table.enu('status', ['active', 'inactive']).defaultTo('active');
    });
  
    await knex.schema.createTable('Product_Images', (table) => {
      table.increments('id').primary();
      table.integer('product_id').references('id').inTable('Products').onDelete('CASCADE');
      table.string('image_url', 255).notNullable();
      table.boolean('is_main').defaultTo(false);
    });
  
    await knex.schema.createTable('Blog_Categories', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.text('description');
    });
  
    await knex.schema.createTable('Blog_Posts', (table) => {
      table.increments('id').primary();
      table.string('title', 255).notNullable();
      table.string('slug', 255).notNullable().unique();
      table.text('content').notNullable();
      table.string('image_url', 255);
      table.integer('category_id').references('id').inTable('Blog_Categories').onDelete('SET NULL');
      table.integer('author_id').references('id').inTable('Users').onDelete('SET NULL');
      table.timestamps(true, true);
    });
  
    await knex.schema.createTable('Blog_Tags', (table) => {
      table.increments('id').primary();
      table.string('name', 50).notNullable();
    });
  
    await knex.schema.createTable('Blog_Post_Tags', (table) => {
      table.integer('post_id').references('id').inTable('Blog_Posts').onDelete('CASCADE');
      table.integer('tag_id').references('id').inTable('Blog_Tags').onDelete('CASCADE');
      table.primary(['post_id', 'tag_id']);
    });
  
    await knex.schema.createTable('Blog_Comments', (table) => {
      table.increments('id').primary();
      table.integer('post_id').references('id').inTable('Blog_Posts').onDelete('CASCADE');
      table.integer('user_id').references('id').inTable('Users').onDelete('CASCADE');
      table.text('comment').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  };
  
  exports.down = async function(knex) {
    await knex.schema
      .dropTableIfExists('Blog_Comments')
      .dropTableIfExists('Blog_Post_Tags')
      .dropTableIfExists('Blog_Tags')
      .dropTableIfExists('Blog_Posts')
      .dropTableIfExists('Blog_Categories')
      .dropTableIfExists('Product_Images')
      .dropTableIfExists('Coupons')
      .dropTableIfExists('Admins')
      .dropTableIfExists('Wishlists')
      .dropTableIfExists('Reviews')
      .dropTableIfExists('Shipping')
      .dropTableIfExists('Payments')
      .dropTableIfExists('Cart')
      .dropTableIfExists('Order_Details')
      .dropTableIfExists('Orders')
      .dropTableIfExists('Products')
      .dropTableIfExists('Categories')
      .dropTableIfExists('Users');
  };
  
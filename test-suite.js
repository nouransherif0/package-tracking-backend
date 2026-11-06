const http = require("http");

function request(urlStr, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || "GET",
      headers: options.headers || {}
    };

    if (body) {
      reqOptions.headers["Content-Type"] = "application/json";
    }

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runFullSmokeTest() {
  console.log("=================================================");
  console.log("🚀 STARTING FULL END-TO-END SYSTEM SMOKE TEST");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} - ${details}`);
      failed++;
    }
  }

  const userBase = "http://localhost:5001/api/users";
  const orderBase = "http://localhost:5002/api/orders";

  try {
    // ----------------------------------------------------
    // FEATURE #1: User Registration
    // ----------------------------------------------------
    console.log("\n--- [Feature #1: User Registration] ---");
    const testEmail = `smoke_${Date.now()}@test.com`;
    const regRes = await request(`${userBase}/register`, { method: "POST" }, {
      name: "Smoke Tester",
      email: testEmail,
      phone: "01099998888",
      password: "password123"
    });
    assert(regRes.status === 201 && regRes.data.user?.email === testEmail, "Register new user");

    const dupRes = await request(`${userBase}/register`, { method: "POST" }, {
      name: "Smoke Tester",
      email: testEmail,
      phone: "01099998888",
      password: "password123"
    });
    assert(dupRes.status === 400, "Validation: Reject duplicate email");

    const shortPassRes = await request(`${userBase}/register`, { method: "POST" }, {
      name: "Short Pass",
      email: `short_${Date.now()}@test.com`,
      phone: "01099998888",
      password: "123"
    });
    assert(shortPassRes.status === 400, "Validation: Reject short password (< 6 chars)");

    // ----------------------------------------------------
    // FEATURE #2: User Login & Authentication
    // ----------------------------------------------------
    console.log("\n--- [Feature #2: User Login & Authentication] ---");
    const userLogin = await request(`${userBase}/login`, { method: "POST" }, {
      email: testEmail,
      password: "password123"
    });
    assert(userLogin.status === 200 && userLogin.data.token && userLogin.data.user.role === "user", "Customer login");
    const userToken = userLogin.data.token;

    const courierLogin = await request(`${userBase}/login`, { method: "POST" }, {
      email: "courier1@gmail.com",
      password: "courier123"
    });
    assert(courierLogin.status === 200 && courierLogin.data.token && courierLogin.data.user.role === "courier", "Courier login");
    const courierToken = courierLogin.data.token;
    const courierId = courierLogin.data.user.id;

    const adminLogin = await request(`${userBase}/login`, { method: "POST" }, {
      email: "admin@gmail.com",
      password: "admin123"
    });
    assert(adminLogin.status === 200 && adminLogin.data.token && adminLogin.data.user.role === "admin", "Admin login");
    const adminToken = adminLogin.data.token;

    const badLogin = await request(`${userBase}/login`, { method: "POST" }, {
      email: testEmail,
      password: "wrong_password"
    });
    assert(badLogin.status === 401, "Reject invalid password credentials");

    // ----------------------------------------------------
    // FEATURE #3 & #4: Create Order Page & API
    // ----------------------------------------------------
    console.log("\n--- [Feature #3 & #4: Create Order API] ---");
    const order1Res = await request(orderBase, {
      method: "POST",
      headers: { Authorization: `Bearer ${userToken}` }
    }, {
      pickup: "Nasr City, Cairo",
      dropoff: "Zamalek, Cairo",
      details: "Electronic Tablet in safety box",
      deliverytime: "2029-01-15T14:30"
    });
    assert(order1Res.status === 201 && order1Res.data.order?.status === "Pending", "Create valid order with future date");
    const order1Id = order1Res.data.order.id;

    const pastDateRes = await request(orderBase, {
      method: "POST",
      headers: { Authorization: `Bearer ${userToken}` }
    }, {
      pickup: "Nasr City",
      dropoff: "Zamalek",
      details: "Tablet",
      deliverytime: "2020-01-01T10:00"
    });
    assert(pastDateRes.status === 400, "Validation: Reject past delivery time");

    const noAuthOrder = await request(orderBase, { method: "POST" }, {
      pickup: "A", dropoff: "B", details: "C", deliverytime: "2029-01-01T10:00"
    });
    assert(noAuthOrder.status === 401, "Auth: Reject unauthenticated order creation");

    // ----------------------------------------------------
    // FEATURE #5: My Orders Page
    // ----------------------------------------------------
    console.log("\n--- [Feature #5: My Orders API] ---");
    const myOrdersRes = await request(orderBase, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const foundOrder1 = myOrdersRes.data.find(o => o.id === order1Id);
    assert(myOrdersRes.status === 200 && foundOrder1 !== undefined, "Fetch customer's orders list");

    // ----------------------------------------------------
    // FEATURE #6: Order Details & Cancel Pending Order
    // ----------------------------------------------------
    console.log("\n--- [Feature #6: Order Details & Cancel Pending Order] ---");
    const detailsRes = await request(`${orderBase}/${order1Id}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(detailsRes.status === 200 && detailsRes.data.pickup === "Nasr City, Cairo", "Retrieve single order details");

    const cancelRes = await request(`${orderBase}/${order1Id}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(cancelRes.status === 200 && cancelRes.data.order.status === "Cancelled", "Cancel pending order as customer");

    const cancelAgainRes = await request(`${orderBase}/${order1Id}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(cancelAgainRes.status === 400, "Reject cancelling non-pending order");

    // ----------------------------------------------------
    // FEATURE #7: Assigned Orders & Courier Accept / Decline
    // ----------------------------------------------------
    console.log("\n--- [Feature #7: Assigned Orders & Courier Accept/Decline] ---");
    // Create order 2 for courier assignment
    const order2Res = await request(orderBase, {
      method: "POST",
      headers: { Authorization: `Bearer ${userToken}` }
    }, {
      pickup: "Maadi, Cairo",
      dropoff: "New Cairo",
      details: "Documents parcel",
      deliverytime: "2029-02-01T12:00"
    });
    const order2Id = order2Res.data.order.id;

    // Admin assigns order 2 to courier
    const assignRes = await request(`${orderBase}/admin/${order2Id}/assign`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${adminToken}` }
    }, { courierid: courierId });
    assert(assignRes.status === 200 && assignRes.data.order.status === "Assigned", "Admin assigns order to courier");

    // Courier checks assigned orders
    const assignedList = await request(`${orderBase}/assigned`, {
      headers: { Authorization: `Bearer ${courierToken}` }
    });
    const foundAssigned = assignedList.data.find(o => o.id === order2Id);
    assert(assignedList.status === 200 && foundAssigned !== undefined, "Courier retrieves assigned orders list");

    // Courier accepts order
    const acceptRes = await request(`${orderBase}/${order2Id}/accept`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${courierToken}` }
    });
    assert(acceptRes.status === 200 && acceptRes.data.order.status === "Accepted", "Courier accepts assigned order");

    // Create order 3 to test Courier decline
    const order3Res = await request(orderBase, {
      method: "POST",
      headers: { Authorization: `Bearer ${userToken}` }
    }, {
      pickup: "Giza",
      dropoff: "6th of October",
      details: "Book package",
      deliverytime: "2029-03-01T12:00"
    });
    const order3Id = order3Res.data.order.id;
    await request(`${orderBase}/admin/${order3Id}/assign`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${adminToken}` }
    }, { courierid: courierId });

    const declineRes = await request(`${orderBase}/${order3Id}/decline`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${courierToken}` }
    });
    assert(declineRes.status === 200 && declineRes.data.order.status === "Declined", "Courier declines assigned order");

    // ----------------------------------------------------
    // FEATURE #8: Courier Update Order Status & History
    // ----------------------------------------------------
    console.log("\n--- [Feature #8: Courier Update Order Status Progression] ---");
    // Picked Up
    const pickedUpRes = await request(`${orderBase}/${order2Id}/status`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${courierToken}` }
    }, { status: "Picked Up" });
    assert(pickedUpRes.status === 200 && pickedUpRes.data.order.status === "Picked Up", "Courier updates status: Picked Up");

    // In Transit
    const inTransitRes = await request(`${orderBase}/${order2Id}/status`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${courierToken}` }
    }, { status: "In Transit" });
    assert(inTransitRes.status === 200 && inTransitRes.data.order.status === "In Transit", "Courier updates status: In Transit");

    // Delivered
    const deliveredRes = await request(`${orderBase}/${order2Id}/status`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${courierToken}` }
    }, { status: "Delivered" });
    assert(deliveredRes.status === 200 && deliveredRes.data.order.status === "Delivered", "Courier updates status: Delivered");

    // Invalid backwards transition
    const invalidStep = await request(`${orderBase}/${order2Id}/status`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${courierToken}` }
    }, { status: "Picked Up" });
    assert(invalidStep.status === 400, "Validation: Prevent invalid status jump from Delivered back to Picked Up");

    // ----------------------------------------------------
    // FEATURE #9: Manage Orders Page (Admin)
    // ----------------------------------------------------
    console.log("\n--- [Feature #9: Manage Orders Page (Admin)] ---");
    const adminAllOrders = await request(`${orderBase}/admin/all`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminAllOrders.status === 200 && Array.isArray(adminAllOrders.data), "Admin fetches all system orders");

    const adminUpdate = await request(`${orderBase}/admin/${order3Id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${adminToken}` }
    }, { status: "Accepted" });
    assert(adminUpdate.status === 200 && adminUpdate.data.order.status === "Accepted", "Admin updates order status");

    const adminDelete = await request(`${orderBase}/admin/${order3Id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminDelete.status === 200, "Admin deletes order and cleans history");

    // ----------------------------------------------------
    // FEATURE #10: Assigned Orders to Courier (Admin)
    // ----------------------------------------------------
    console.log("\n--- [Feature #10: Assigned Orders to Courier (Admin)] ---");
    const assignmentsRes = await request(`${orderBase}/admin/assignments`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(assignmentsRes.status === 200 && Array.isArray(assignmentsRes.data), "Admin fetches courier assignments with courier details");

    // Non-admin rejected
    const nonAdminAssign = await request(`${orderBase}/admin/assignments`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(nonAdminAssign.status === 403, "Access Control: Reject non-admin from admin assignment management");

    console.log("\n=================================================");
    console.log(`🏁 SMOKE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("Test execution failed with error:", err);
    process.exit(1);
  }
}

runFullSmokeTest();


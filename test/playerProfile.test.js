const test = require("node:test");
const assert = require("node:assert/strict");
const {
  formatUserId,
  normalizeProfile,
  parseCityState,
  validateInstallationId,
  validateProfile,
  validateProfilePhoto,
} = require("../src/playerProfile");

test("formats sequential player numbers as DeedXchange IDs", () => {
  assert.equal(formatUserId(1), "DX-000-00-0001");
  assert.equal(formatUserId(123456789), "DX-123-45-6789");
  assert.equal(formatUserId(999999999), "DX-999-99-9999");
});

test("requires a valid JPEG or PNG player picture", () => {
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(40)]).toString("base64");
  assert.equal(validateProfilePhoto(jpeg, "image/jpeg").error, undefined);
  assert.notEqual(validateProfilePhoto(jpeg, "image/png").error, undefined);
  assert.notEqual(validateProfilePhoto("", "image/jpeg").error, undefined);
});

test("normalizes profile fields", () => {
  assert.deepEqual(
    normalizeProfile({
      username: "  Paul  R ",
      address: "  123  Main St ",
      cityState: " Akron, oh ",
      zip: "44308",
    }),
    { username: "Paul R", address: "123 Main St", city: "Akron", state: "OH", zip: "44308" }
  );
});

test("separates a combined City, ST entry", () => {
  assert.deepEqual(parseCityState("Akron, oh"), { city: "Akron", state: "OH" });
  assert.deepEqual(parseCityState("Cuyahoga Falls, OH"), {
    city: "Cuyahoga Falls",
    state: "OH",
  });
  assert.deepEqual(parseCityState("Akron Ohio"), { city: "", state: "" });
});

test("validates installation IDs and profiles", () => {
  assert.equal(validateInstallationId("9eb00d5e-f2b7-4a5d-a52d-61a85efc9338"), null);
  assert.notEqual(validateInstallationId("not-a-uuid"), null);
  assert.equal(
    validateProfile({
      username: "Player One",
      address: "123 Main St",
      city: "Akron",
      state: "OH",
      zip: "44308",
    }),
    null
  );
  assert.notEqual(
    validateProfile({
      username: "x",
      address: "",
      city: "A",
      state: "Ohio",
      zip: "44308-1234",
    }),
    null
  );
});

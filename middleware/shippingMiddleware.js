// middlewares/shipping.js
const axios = require('axios');

const RAJAONGKIR_API_KEY = process.env.RAJAONGKIR_API_KEY;
const RAJAONGKIR_URL = 'https://pro.rajaongkir.com/api';

async function checkShippingCost(originSubdistrictId, destinationSubdistrictId, weight, courier) {
  const response = await axios.post(
    `${RAJAONGKIR_URL}/cost`,
    {
      origin: originSubdistrictId,
      originType: 'subdistrict',
      destination: destinationSubdistrictId,
      destinationType: 'subdistrict',
      weight,
      courier,
    },
    {
      headers: {
        key: RAJAONGKIR_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.rajaongkir.results;
}

module.exports = { checkShippingCost };

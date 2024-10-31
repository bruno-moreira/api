import http from "k6/http";
import { check, sleep } from "k6";
import { randomString, randomIntBetween } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

export const options = {
    vus: 2,
    duration: "10s",
    thresholds: {
        http_req_duration: ["p(95)<200"], // 95% das requisições devem ter duração inferior a 200ms
        http_req_failed: ["rate<0.01"], // Menos de 1% das requisições podem falhar
    },
};

export default function () {
    const BASE_URL = "http://localhost:8080";
    const headers = { "Content-Type": "application/json" };
    
    // Envio de uma requisição GET
    const todos = http.get(`${BASE_URL}/api/v1/todos?limit=${randomIntBetween(1, 50)}`, { headers });
    check(todos, {
        "status is 200": (r) => r.status === 200,
    });

    // Criar um novo TODO com uma requisição POST
    const payload = JSON.stringify({
        task: randomString(20),
        description: randomString(50),
    });
    const res = http.post(`${BASE_URL}/api/v1/todos`, payload, { headers });
    check(res, {
        "status is 201": (r) => r.status === 201,
    });
}

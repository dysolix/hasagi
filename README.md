# hasagi

A TypeScript library that helps you interact with the League Client API (LCU)

```
npm install @dysolix/hasagi
```

You can use Hasagi to send a request like this

```
import { HasagiClient } from "@dysolix/hasagi";

const client = new HasagiClient();
await client.connect();

const response = client.request({
    method: "GET",
    url: "/lol-summoner/v1/current-summoner"
}).then(res => res.data);
```

The request method has this signature
```
request<ResponseDataType = any, ResponseType = AxiosResponse<ResponseDataType, any>, BodyType = any>(config: AxiosRequestConfig<BodyType>): Promise<ResponseType>
```
See https://axios-http.com/docs/req_config for more information about the request config and https://axios-http.com/docs/res_schema for more information about the response.

The methods and fields are designed and named in a understandable way (I hope), so you should be able to find what you need if your IDE/editor has auto-complete.

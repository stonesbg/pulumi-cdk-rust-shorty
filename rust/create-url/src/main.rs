use lambda_http::{run, service_fn, RequestPayloadExt, Body, Error, Request, IntoResponse, Response};
use serde::{Deserialize, Serialize};
use aws_sdk_dynamodb::{Client};
use rand::Rng;
use base64::Engine;

#[derive(Deserialize)]
struct LambdaRequest {
    url: String,
}

#[derive(Serialize)]
struct LambdaResponse {
    short_url: String,
}

async fn function_handler(event: Request) -> Result<impl IntoResponse, Error> {
    let config = aws_config::load_from_env().await;
    let client = Client::new(&config);
    let table_name = std::env::var("TABLE_NAME")?;

    match event.payload::<LambdaRequest>() {
        Ok(Some(body)) => {
            // Successfully deserialized the body
            println!("Received URL: {}", body.url);
            // Generate a random short URL
            let short_url = generate_short_url();

            tracing::info!("Short URL: {}", short_url);
            tracing::info!("Long URL: {}", body.url);

            // Store the mapping in DynamoDB
            client.put_item()
                .table_name(table_name)
                .item("short_url", aws_sdk_dynamodb::types::AttributeValue::S(short_url.clone()))
                .item("long_url", aws_sdk_dynamodb::types::AttributeValue::S(body.url))
                .send()
                .await?;

            Ok(Response::builder()
                .status(200)
                .body(Body::Text(serde_json::to_string(&LambdaResponse { short_url }).unwrap()))
                .unwrap())
        },
        Ok(None) => {
            // No body in the request
            Ok(Response::builder()
                .status(400)
                .body("Missing request body".into())
                .unwrap())
        },
        Err(e) => {
            // Error deserializing the body
            eprintln!("Error: {:?}", e);
            Ok(Response::builder()
                .status(400)
                .body("Invalid request body".into())
                .unwrap())
        }
    }
}

fn generate_short_url() -> String {
    let mut rng = rand::thread_rng();
    let random_bytes: Vec<u8> = (0..6).map(|_| rng.gen()).collect();
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&random_bytes)[0..6].to_string()
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false)
        .without_time()
        .init();

    run(service_fn(function_handler)).await
}

use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use aws_sdk_dynamodb::{Client};
use rand::Rng;
use base64::Engine;

#[derive(Deserialize)]
struct Request {
    url: String,
}

#[derive(Serialize)]
struct Response {
    short_url: String,
}

async fn function_handler(event: LambdaEvent<Request>) -> Result<Response, Error> {
    let config = aws_config::load_from_env().await;
    let client = Client::new(&config);
    let table_name = std::env::var("TABLE_NAME")?;

    // Generate a random short URL
    let short_url = generate_short_url();

    // Store the mapping in DynamoDB
    client.put_item()
        .table_name(table_name)
        .item("short_url", aws_sdk_dynamodb::types::AttributeValue::S(short_url.clone()))
        .item("long_url", aws_sdk_dynamodb::types::AttributeValue::S(event.payload.url))
        .send()
        .await?;

    Ok(Response { short_url })
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

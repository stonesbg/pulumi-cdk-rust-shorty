use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use aws_sdk_dynamodb::Client;

#[derive(Deserialize)]
struct Request {
    path_parameters: PathParameters,
}

#[derive(Deserialize)]
struct PathParameters {
    short_url: String,
}

#[derive(Serialize)]
struct Response {
    status_code: u32,
    headers: std::collections::HashMap<String, String>,
    body: String,
}

async fn function_handler(event: LambdaEvent<Request>) -> Result<Response, Error> {
    let config = aws_config::load_from_env().await;
    let client = Client::new(&config);
    let table_name = std::env::var("TABLE_NAME")?;

    let short_url = event.payload.path_parameters.short_url;

    // Look up the long URL in DynamoDB
    let result = client.get_item()
        .table_name(table_name)
        .key("short_url", aws_sdk_dynamodb::types::AttributeValue::S(short_url))
        .send()
        .await?;

    let mut headers = std::collections::HashMap::new();

    match result.item {
        Some(item) => {
            if let Some(long_url) = item.get("long_url") {
                if let aws_sdk_dynamodb::types::AttributeValue::S(url) = long_url {
                    headers.insert("Location".to_string(), url.clone());
                    return Ok(Response {
                        status_code: 302,
                        headers,
                        body: "".to_string(),
                    });
                }
            }
        }
        None => (),
    }

    headers.insert("Content-Type".to_string(), "text/plain".to_string());
    Ok(Response {
        status_code: 404,
        headers,
        body: "URL not found".to_string(),
    })
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

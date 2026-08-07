from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "infra" / "ned-create-staging.yaml"


def load_template():
    # PyYAML treats CloudFormation short tags as constructors; the template uses long-form functions.
    return yaml.safe_load(TEMPLATE.read_text())


def test_staging_stack_is_isolated_budget_minimal_and_complete():
    template = load_template()
    resources = template["Resources"]
    types = [resource["Type"] for resource in resources.values()]
    assert "AWS::AppRunner::Service" in types
    assert "AWS::Cognito::UserPool" in types
    assert "AWS::Cognito::UserPoolClient" in types
    assert "AWS::DynamoDB::Table" in types
    assert "AWS::KMS::Key" in types
    assert "AWS::IAM::Role" in types
    assert types.count("AWS::CloudWatch::Alarm") >= 3
    rendered = TEMPLATE.read_text()
    assert "noegodev-ned-staging" in rendered
    assert "noegodev-site-staging" not in rendered
    assert "noegodev-site" not in rendered
    assert "PAY_PER_REQUEST" in rendered
    assert "TimeToLiveSpecification" in rendered
    assert "RuntimeEnvironmentSecrets" in rendered
    assert "AutoDeploymentsEnabled: false" in rendered


def test_runtime_role_is_least_privilege_and_cannot_mutate_identity_or_infrastructure():
    template = load_template()
    role = template["Resources"]["AppRunnerInstanceRole"]
    statements = role["Properties"]["Policies"][0]["PolicyDocument"]["Statement"]
    actions = {
        action
        for statement in statements
        for action in (statement["Action"] if isinstance(statement["Action"], list) else [statement["Action"]])
    }
    assert {"dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Scan"} <= actions
    assert {"secretsmanager:CreateSecret", "secretsmanager:GetSecretValue", "secretsmanager:DeleteSecret"} <= actions
    assert "cloudwatch:PutMetricData" in actions
    assert not any(action.startswith("cognito-idp:") for action in actions)
    assert not any(action.startswith("apprunner:") for action in actions)
    assert "iam:PassRole" not in actions


def test_cognito_and_app_runner_fail_closed_security_configuration():
    template = load_template()
    pool = template["Resources"]["StagingUserPool"]["Properties"]
    client = template["Resources"]["StagingUserPoolClient"]["Properties"]
    service = template["Resources"]["StagingService"]["Properties"]
    assert pool["AccountRecoverySetting"]["RecoveryMechanisms"][0]["Name"] == "verified_email"
    assert pool["MfaConfiguration"] == "OPTIONAL"
    assert client["GenerateSecret"] is False
    assert client["PreventUserExistenceErrors"] == "ENABLED"
    assert "ALLOW_USER_PASSWORD_AUTH" in client["ExplicitAuthFlows"]
    assert service["HealthCheckConfiguration"]["Path"] == "/healthz"
    assert service["SourceConfiguration"]["AutoDeploymentsEnabled"] is False

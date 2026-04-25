param(
  [int]$Port = 4173
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$PublicRoot = Join-Path $Root "public"
$DataRoot = Join-Path $Root "data"

function Get-ReasonPhrase {
  param([int]$StatusCode)

  switch ($StatusCode) {
    200 { "OK" }
    201 { "Created" }
    400 { "Bad Request" }
    404 { "Not Found" }
    500 { "Internal Server Error" }
    default { "OK" }
  }
}

function Get-MimeType {
  param([string]$Path)

  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".js" { "application/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".svg" { "image/svg+xml" }
    ".png" { "image/png" }
    ".jpg" { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".webp" { "image/webp" }
    default { "application/octet-stream" }
  }
}

function Write-HttpResponse {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [byte[]]$BodyBytes,
    [string]$ContentType = "text/plain; charset=utf-8"
  )

  $reason = Get-ReasonPhrase -StatusCode $StatusCode
  $header = @(
    "HTTP/1.1 $StatusCode $reason"
    "Content-Type: $ContentType"
    "Content-Length: $($BodyBytes.Length)"
    "Cache-Control: no-store"
    "Connection: close"
    ""
    ""
  ) -join "`r`n"

  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($BodyBytes.Length -gt 0) {
    $Stream.Write($BodyBytes, 0, $BodyBytes.Length)
  }
}

function Write-Text {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [string]$Body,
    [string]$ContentType = "text/plain; charset=utf-8"
  )

  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
  Write-HttpResponse -Stream $Stream -StatusCode $StatusCode -BodyBytes $bytes -ContentType $ContentType
}

function Write-Json {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [object]$Data
  )

  $json = $Data | ConvertTo-Json -Depth 20
  Write-Text -Stream $Stream -StatusCode $StatusCode -Body $json -ContentType "application/json; charset=utf-8"
}

function Resolve-StaticPath {
  param([string]$UrlPath)

  $relative = [System.Uri]::UnescapeDataString($UrlPath.TrimStart("/"))
  if ([string]::IsNullOrWhiteSpace($relative)) {
    $relative = "index.html"
  }

  if ($relative.Contains("..")) {
    return $null
  }

  $path = Join-Path $PublicRoot $relative
  if (Test-Path -LiteralPath $path -PathType Container) {
    $path = Join-Path $path "index.html"
  }

  return $path
}

function Append-JsonRecord {
  param(
    [string]$Path,
    [object]$Record
  )

  $items = New-Object System.Collections.ArrayList

  if (Test-Path -LiteralPath $Path) {
    $content = Get-Content -LiteralPath $Path -Raw
    if (-not [string]::IsNullOrWhiteSpace($content)) {
      $parsed = $content | ConvertFrom-Json
      if ($null -ne $parsed) {
        if ($parsed -is [System.Array]) {
          foreach ($item in $parsed) {
            [void]$items.Add($item)
          }
        } else {
          [void]$items.Add($parsed)
        }
      }
    }
  }

  [void]$items.Add([pscustomobject]$Record)
  $array = @($items.ToArray())
  ConvertTo-Json -InputObject $array -Depth 12 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Read-HttpRequest {
  param([System.Net.Sockets.NetworkStream]$Stream)

  $buffer = New-Object byte[] 65536
  $builder = New-Object System.Collections.Generic.List[byte]
  $headerEnd = -1
  $contentLength = 0

  while ($true) {
    $read = $Stream.Read($buffer, 0, $buffer.Length)
    if ($read -le 0) {
      break
    }

    for ($i = 0; $i -lt $read; $i++) {
      $builder.Add($buffer[$i])
    }

    $bytes = $builder.ToArray()
    $text = [System.Text.Encoding]::ASCII.GetString($bytes)
    $headerEnd = $text.IndexOf("`r`n`r`n")

    if ($headerEnd -ge 0) {
      $headerText = $text.Substring(0, $headerEnd)
      foreach ($line in $headerText -split "`r`n") {
        if ($line.ToLowerInvariant().StartsWith("content-length:")) {
          $contentLength = [int]($line.Split(":", 2)[1].Trim())
        }
      }

      $bodyStart = $headerEnd + 4
      if (($bytes.Length - $bodyStart) -ge $contentLength) {
        break
      }
    }
  }

  $allBytes = $builder.ToArray()
  $allText = [System.Text.Encoding]::UTF8.GetString($allBytes)
  $splitIndex = $allText.IndexOf("`r`n`r`n")
  if ($splitIndex -lt 0) {
    return $null
  }

  $headerText = $allText.Substring(0, $splitIndex)
  $headerLines = $headerText -split "`r`n"
  $requestLine = $headerLines[0] -split " "
  $body = $allText.Substring($splitIndex + 4)

  return [ordered]@{
    Method = $requestLine[0]
    Path = ($requestLine[1] -split "\?")[0]
    Body = $body
  }
}

function Handle-Api {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [hashtable]$Request
  )

  $path = $Request.Path
  $method = $Request.Method

  if ($path -eq "/api/health" -and $method -eq "GET") {
    Write-Json -Stream $Stream -StatusCode 200 -Data @{
      status = "ok"
      app = "GERD"
      time = (Get-Date).ToString("o")
    }
    return
  }

  if (($path -eq "/api/case-study" -or $path -eq "/api/dashboard") -and $method -eq "GET") {
    $sitePath = Join-Path $DataRoot "site.json"
    if ($path -eq "/api/dashboard") {
      $site = Get-Content -LiteralPath $sitePath -Raw | ConvertFrom-Json
      Write-Json -Stream $Stream -StatusCode 200 -Data $site.dashboard
    } else {
      Write-Text -Stream $Stream -StatusCode 200 -Body (Get-Content -LiteralPath $sitePath -Raw) -ContentType "application/json; charset=utf-8"
    }
    return
  }

  if ($path -eq "/api/contact" -and $method -eq "POST") {
    $payload = $Request.Body | ConvertFrom-Json
    $record = [ordered]@{
      id = [guid]::NewGuid().ToString()
      createdAt = (Get-Date).ToString("o")
      name = [string]$payload.name
      email = [string]$payload.email
      message = [string]$payload.message
    }

    Append-JsonRecord -Path (Join-Path $DataRoot "messages.json") -Record $record
    Write-Json -Stream $Stream -StatusCode 201 -Data @{ ok = $true; id = $record.id }
    return
  }

  if ($path -eq "/api/symptoms" -and $method -eq "POST") {
    $payload = $Request.Body | ConvertFrom-Json
    $record = [ordered]@{
      id = [guid]::NewGuid().ToString()
      createdAt = (Get-Date).ToString("o")
      symptom = [string]$payload.symptom
      severity = [int]$payload.severity
      trigger = [string]$payload.trigger
    }

    Append-JsonRecord -Path (Join-Path $DataRoot "symptom-submissions.json") -Record $record
    Write-Json -Stream $Stream -StatusCode 201 -Data @{ ok = $true; id = $record.id }
    return
  }

  Write-Json -Stream $Stream -StatusCode 404 -Data @{ error = "API route not found" }
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()

Write-Host "GERD is running at http://localhost:$Port/"
Write-Host "Press Ctrl+C to stop."

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $request = Read-HttpRequest -Stream $stream

      if ($null -eq $request) {
        Write-Json -Stream $stream -StatusCode 400 -Data @{ error = "Malformed request" }
        continue
      }

      if ($request.Path.StartsWith("/api/")) {
        Handle-Api -Stream $stream -Request $request
        continue
      }

      $staticPath = Resolve-StaticPath -UrlPath $request.Path
      if ($null -eq $staticPath -or -not (Test-Path -LiteralPath $staticPath -PathType Leaf)) {
        $staticPath = Join-Path $PublicRoot "index.html"
      }

      $bytes = [System.IO.File]::ReadAllBytes($staticPath)
      Write-HttpResponse -Stream $stream -StatusCode 200 -BodyBytes $bytes -ContentType (Get-MimeType -Path $staticPath)
    } catch {
      try {
        Write-Json -Stream $stream -StatusCode 500 -Data @{ error = $_.Exception.Message }
      } catch {
      }
    } finally {
      if ($null -ne $stream) {
        $stream.Dispose()
      }
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}

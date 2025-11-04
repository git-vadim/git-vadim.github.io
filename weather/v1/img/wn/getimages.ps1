# Path to the text file containing URLs
$urlFile = "images.txt"

# Read each line (URL) from the text file
Get-Content $urlFile | ForEach-Object {
    # Download the image from the URL
    $url = $_
    $fileName = Split-Path -Leaf $url
    $outputPath = Join-Path -Path $PSScriptRoot -ChildPath $fileName
    Invoke-WebRequest -Uri $url -OutFile $outputPath
}

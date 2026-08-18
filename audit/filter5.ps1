$out = 'C:\Users\l2026\Documents\Default Project\cangxi1949_1953\audit'
$liRaw = Import-Csv -LiteralPath "$out\surname_li_raw.csv" -Encoding UTF8
$kept = @()
foreach ($r in $liRaw) {
  if ($r.raw_name -eq '李元泽' -or $r.raw_name -like '李元*') {
    $kept += [pscustomobject]@{ book = $r.book; page = $r.page; raw = $r.raw_name; ctx = ($r.ctx_before + $r.ctx_after) }
  }
}
$kept | Sort-Object raw, book, page | ForEach-Object { "{0}|{1}|{2}|{3}" -f $_.raw, $_.book, $_.page, $_.ctx } |
  Set-Content -LiteralPath "$out\audit_li_yuanze.txt" -Encoding UTF8
Write-Output "yuanze_rows=$($kept.Count)"

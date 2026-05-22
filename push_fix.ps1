Set-Location "c:\Users\HP\OneDrive\Desktop\dforzze (1)\dforzze"

# Configurar git para usar UTF-8
git config core.quotepath false

# Re-agregar los archivos con encoding correcto
git add -f tienda.html
git add -f catalogo.html

git status --short

git commit -m "Fix encoding UTF-8: tienda y catalogo"
git push origin main

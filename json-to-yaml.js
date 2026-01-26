#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Vérifier que le nom de fichier est fourni
if (process.argv.length < 3) {
  console.error('Usage: node json-to-yaml.js <input.json> [output.yaml]');
  console.error('Example: node json-to-yaml.js data.json output.yaml');
  process.exit(1);
}

const inputFile = process.argv[2];
const outputFile = process.argv[3] || inputFile.replace('.json', '.yaml');

// Vérifier que le fichier d'entrée existe
if (!fs.existsSync(inputFile)) {
  console.error(`Error: File ${inputFile} does not exist`);
  process.exit(1);
}

try {
  // Lire le fichier JSON
  const jsonContent = fs.readFileSync(inputFile, 'utf8');
  
  // Parser le JSON
  const data = JSON.parse(jsonContent);
  
  // Convertir en YAML sans références arrière
  const yamlContent = yaml.dump(data, {
    noRefs: true,          // Désactive les références circulaires
    indent: 2,             // Indentation de 2 espaces
    lineWidth: -1,         // Pas de limite de largeur de ligne
    skipInvalid: true,     // Ignore les valeurs invalides
    sortKeys: true,        // Trie les clés pour une sortie cohérente
    styles: {
      '!!null': 'canonical' // Utilise 'null' au lieu de '' pour les valeurs nulles
    }
  });
  
  // Écrire le fichier YAML
  fs.writeFileSync(outputFile, yamlContent, 'utf8');
  
  console.log(`Successfully converted ${inputFile} to ${outputFile}`);
  console.log(`Output file size: ${yamlContent.length} bytes`);
  
} catch (error) {
  console.error('Error during conversion:', error.message);
  
  if (error instanceof SyntaxError) {
    console.error('JSON syntax error in input file');
    console.error('Error details:', error.message);
  } else if (error.code === 'ENOENT') {
    console.error('File not found:', inputFile);
  } else {
    console.error('Unexpected error:', error);
  }
  
  process.exit(1);
}
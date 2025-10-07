#!/usr/bin/env node

/**
 * 🎨 Design Switcher - Pump Dex Mini App
 * Переключение между версиями дизайна
 */

const fs = require('fs');
const path = require('path');

const DESIGNS = {
    'v1': {
        name: 'Original Design',
        folder: 'public/designs/v1-original',
        files: {
            'index.html': 'public/index.html',
            'script.js': 'public/script.js',
            'style-modern.css': 'public/style-modern.css'
        }
    },
    'v2': {
        name: 'Lovable Design',
        folder: 'public/designs/v2-lovable',
        files: {
            'index-lovable.html': 'public/index.html',
            'script-lovable.js': 'public/script.js',
            'style-lovable.css': 'public/style-lovable.css'
        }
    }
};

function switchDesign(version) {
    const design = DESIGNS[version];
    
    if (!design) {
        console.error(`❌ Неизвестная версия: ${version}`);
        console.log('📋 Доступные версии:');
        Object.keys(DESIGNS).forEach(key => {
            console.log(`   ${key} - ${DESIGNS[key].name}`);
        });
        process.exit(1);
    }
    
    console.log(`🎨 Переключение на ${design.name}...`);
    
    // Проверяем существование файлов
    const missingFiles = [];
    Object.keys(design.files).forEach(sourceFile => {
        const sourcePath = path.join(design.folder, sourceFile);
        if (!fs.existsSync(sourcePath)) {
            missingFiles.push(sourceFile);
        }
    });
    
    if (missingFiles.length > 0) {
        console.error(`❌ Отсутствуют файлы в ${design.folder}:`);
        missingFiles.forEach(file => console.error(`   - ${file}`));
        process.exit(1);
    }
    
    // Копируем файлы
    let copiedFiles = 0;
    Object.entries(design.files).forEach(([sourceFile, targetFile]) => {
        const sourcePath = path.join(design.folder, sourceFile);
        const targetPath = targetFile;
        
        try {
            // Создаем резервную копию текущего файла
            if (fs.existsSync(targetPath)) {
                const backupPath = `${targetPath}.backup`;
                fs.copyFileSync(targetPath, backupPath);
                console.log(`💾 Создана резервная копия: ${backupPath}`);
            }
            
            // Копируем новый файл
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`✅ ${sourceFile} → ${targetFile}`);
            copiedFiles++;
            
        } catch (error) {
            console.error(`❌ Ошибка копирования ${sourceFile}:`, error.message);
        }
    });
    
    console.log(`🎉 Успешно переключено на ${design.name}!`);
    console.log(`📁 Скопировано файлов: ${copiedFiles}`);
    console.log('🔄 Перезапустите сервер для применения изменений');
}

function listDesigns() {
    console.log('📋 Доступные версии дизайна:');
    console.log('');
    
    Object.entries(DESIGNS).forEach(([key, design]) => {
        console.log(`🎨 ${key} - ${design.name}`);
        console.log(`   📁 Папка: ${design.folder}`);
        console.log(`   📄 Файлы:`);
        Object.keys(design.files).forEach(file => {
            console.log(`      - ${file}`);
        });
        console.log('');
    });
}

function showHelp() {
    console.log('🎨 Design Switcher - Pump Dex Mini App');
    console.log('');
    console.log('Использование:');
    console.log('  node switch-design.js <version>  - Переключить на версию');
    console.log('  node switch-design.js list       - Показать доступные версии');
    console.log('  node switch-design.js help       - Показать справку');
    console.log('');
    console.log('Примеры:');
    console.log('  node switch-design.js v1         - Переключить на оригинальный дизайн');
    console.log('  node switch-design.js v2         - Переключить на Lovable дизайн');
    console.log('');
}

// Основная логика
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
    showHelp();
    process.exit(1);
}

switch (command) {
    case 'help':
    case '--help':
    case '-h':
        showHelp();
        break;
        
    case 'list':
        listDesigns();
        break;
        
    default:
        switchDesign(command);
        break;
}


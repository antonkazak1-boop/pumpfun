#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎨 Создание резервных копий дизайнов...\n');

// Файлы для резервного копирования
const backups = [
    {
        source: 'public/index.html',
        target: 'public/designs/v1-original/index.html',
        name: 'Оригинальный index.html'
    },
    {
        source: 'public/script.js',
        target: 'public/designs/v1-original/script.js',
        name: 'Оригинальный script.js'
    },
    {
        source: 'public/style-modern.css',
        target: 'public/designs/v1-original/style-modern.css',
        name: 'Оригинальный style-modern.css'
    },
    {
        source: 'public/index-lovable.html',
        target: 'public/designs/v2-lovable/index-lovable.html',
        name: 'Lovable index.html'
    },
    {
        source: 'public/script-lovable.js',
        target: 'public/designs/v2-lovable/script-lovable.js',
        name: 'Lovable script.js'
    },
    {
        source: 'public/style-lovable.css',
        target: 'public/designs/v2-lovable/style-lovable.css',
        name: 'Lovable style.css'
    }
];

let successCount = 0;
let errorCount = 0;

backups.forEach(backup => {
    try {
        if (fs.existsSync(backup.source)) {
            // Создаем директорию если не существует
            const targetDir = path.dirname(backup.target);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
                console.log(`📁 Создана папка: ${targetDir}`);
            }
            
            // Копируем файл
            fs.copyFileSync(backup.source, backup.target);
            console.log(`✅ ${backup.name}`);
            console.log(`   ${backup.source} → ${backup.target}\n`);
            successCount++;
        } else {
            console.log(`⚠️  ${backup.name} - файл не найден`);
            console.log(`   ${backup.source}\n`);
            errorCount++;
        }
    } catch (error) {
        console.error(`❌ Ошибка при копировании ${backup.name}:`);
        console.error(`   ${error.message}\n`);
        errorCount++;
    }
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 Результат: ${successCount} успешно, ${errorCount} ошибок`);
console.log('🎉 Резервные копии созданы!\n');

console.log('📋 Доступные команды:');
console.log('   node switch-design.js list   - Показать версии');
console.log('   node switch-design.js v1     - Переключить на v1');
console.log('   node switch-design.js v2     - Переключить на v2');


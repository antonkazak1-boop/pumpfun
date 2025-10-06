// Функция для переключения выпадающих списков
function toggleDropdown(groupName) {
    const dropdown = document.querySelector(`[data-group="${groupName}"]`);
    const isOpen = dropdown.classList.contains('open');
    
    // Закрываем все другие выпадающие списки
    document.querySelectorAll('.dropdown-group').forEach(group => {
        group.classList.remove('open');
    });
    
    // Переключаем текущий
    if (!isOpen) {
        dropdown.classList.add('open');
    }
}

// Закрытие выпадающих списков при клике вне их
document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-group')) {
        document.querySelectorAll('.dropdown-group').forEach(group => {
            group.classList.remove('open');
        });
    }
});

// Инициализация выпадающих списков
function initDropdownNavigation() {
    // Добавляем обработчики для кнопок в выпадающих списках
    document.querySelectorAll('.dropdown-content .tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            switchTab(tabName);
            
            // Закрываем выпадающий список после выбора
            document.querySelectorAll('.dropdown-group').forEach(group => {
                group.classList.remove('open');
            });
        });
    });
}

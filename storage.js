// نظام حفظ البطاقات على الموقع
const CardStorage = {
    // مفاتيح التخزين
    KEYS: {
        CARDS: 'interactive_cards_data',
        BACKUPS: 'interactive_cards_backups',
        SETTINGS: 'interactive_cards_settings',
        STATS: 'interactive_cards_stats'
    },

    // تهيئة النظام
    init: function() {
        console.log('💾 نظام التخزين جاهز');
        this.ensureBackup();
        return this.loadCards();
    },

    // تحميل البطاقات من LocalStorage
    loadCards: function() {
        try {
            const saved = localStorage.getItem(this.KEYS.CARDS);
            if (saved) {
                const parsed = JSON.parse(saved);
                console.log(`📂 تم تحميل ${parsed.length} بطاقة`);
                return parsed;
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل البطاقات:', error);
        }
        return null;
    },

    // حفظ البطاقات
    saveCards: function(cards) {
        try {
            const data = JSON.stringify(cards);
            localStorage.setItem(this.KEYS.CARDS, data);
            
            // إنشاء نسخة احتياطية تلقائية
            this.createAutoBackup(cards);
            
            console.log(`💾 تم حفظ ${cards.length} بطاقة`);
            return true;
        } catch (error) {
            console.error('❌ خطأ في حفظ البطاقات:', error);
            return false;
        }
    },

    // إنشاء نسخة احتياطية
    createBackup: function(cards, backupName = 'نسخة احتياطية') {
        try {
            const backups = this.getBackups();
            const backup = {
                id: Date.now(),
                name: backupName,
                date: new Date().toLocaleString('ar-SA'),
                data: cards,
                count: cards.length
            };

            backups.push(backup);
            
            // حفظ آخر 10 نسخ فقط
            if (backups.length > 10) {
                backups.shift();
            }

            localStorage.setItem(this.KEYS.BACKUPS, JSON.stringify(backups));
            console.log(`📦 تم إنشاء نسخة احتياطية: ${backupName}`);
            return backup;
        } catch (error) {
            console.error('❌ خطأ في إنشاء النسخة الاحتياطية:', error);
            return null;
        }
    },

    // نسخة احتياطية تلقائية (يومية)
    createAutoBackup: function(cards) {
        const today = new Date().toDateString();
        const lastBackup = localStorage.getItem('last_auto_backup');
        
        if (lastBackup !== today) {
            const backupName = `نسخة تلقائية ${new Date().toLocaleDateString('ar-SA')}`;
            this.createBackup(cards, backupName);
            localStorage.setItem('last_auto_backup', today);
        }
    },

    // جلب جميع النسخ الاحتياطية
    getBackups: function() {
        try {
            const saved = localStorage.getItem(this.KEYS.BACKUPS);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            return [];
        }
    },

    // استعادة من نسخة احتياطية
    restoreBackup: function(backupId) {
        const backups = this.getBackups();
        const backup = backups.find(b => b.id === backupId);
        
        if (backup) {
            this.saveCards(backup.data);
            console.log(`🔄 تم استعادة النسخة: ${backup.name}`);
            return backup.data;
        }
        return null;
    },

    // حذف نسخة احتياطية
    deleteBackup: function(backupId) {
        const backups = this.getBackups();
        const filtered = backups.filter(b => b.id !== backupId);
        localStorage.setItem(this.KEYS.BACKUPS, JSON.stringify(filtered));
        return filtered;
    },

    // تصدير البطاقات إلى ملف
    exportCards: function(cards, filename = 'بطاقات_تفاعلية.json') {
        try {
            const dataStr = JSON.stringify(cards, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            // إنشاء رابط للتحميل
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = filename;
            link.click();
            
            URL.revokeObjectURL(link.href);
            console.log(`📤 تم تصدير ${cards.length} بطاقة`);
            return true;
        } catch (error) {
            console.error('❌ خطأ في التصدير:', error);
            return false;
        }
    },

    // استيراد البطاقات من ملف
    importCards: function(file, onComplete) {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const importedCards = JSON.parse(event.target.result);
                
                if (!Array.isArray(importedCards)) {
                    throw new Error('الملف يجب أن يحتوي على مصفوفة من البطاقات');
                }

                // التحقق من صحة البيانات
                const validCards = importedCards.filter(card => 
                    card && card.id && card.en && card.ar
                );

                if (validCards.length === 0) {
                    throw new Error('لم يتم العثور على بطاقات صالحة في الملف');
                }

                console.log(`📥 تم استيراد ${validCards.length} بطاقة`);
                onComplete(validCards, null);
            } catch (error) {
                console.error('❌ خطأ في الاستيراد:', error);
                onComplete(null, error.message);
            }
        };

        reader.onerror = () => {
            onComplete(null, 'خطأ في قراءة الملف');
        };

        reader.readAsText(file);
    },

    // جلب إحصائيات التخزين
    getStorageStats: function() {
        const cards = this.loadCards() || [];
        const backups = this.getBackups();
        
        // حساب الحجم التقريبي
        const cardsSize = JSON.stringify(cards).length;
        const backupsSize = JSON.stringify(backups).length;
        const totalSize = cardsSize + backupsSize;

        return {
            cardsCount: cards.length,
            backupsCount: backups.length,
            cardsSize: this.formatSize(cardsSize),
            backupsSize: this.formatSize(backupsSize),
            totalSize: this.formatSize(totalSize),
            lastModified: localStorage.getItem('cards_last_modified') || 'غير متوفر'
        };
    },

    // تنسيق الحجم
    formatSize: function(bytes) {
        if (bytes < 1024) return bytes + ' بايت';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' كيلوبايت';
        return (bytes / (1024 * 1024)).toFixed(2) + ' ميجابايت';
    },

    // التأكد من وجود نسخة احتياطية
    ensureBackup: function() {
        const cards = this.loadCards();
        if (cards && cards.length > 0) {
            const backups = this.getBackups();
            if (backups.length === 0) {
                this.createBackup(cards, 'نسخة أولية');
            }
        }
    },

    // مسح جميع البيانات
    clearAllData: function() {
        if (confirm('هل أنت متأكد من حذف جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.')) {
            localStorage.removeItem(this.KEYS.CARDS);
            localStorage.removeItem(this.KEYS.BACKUPS);
            localStorage.removeItem('cards_last_modified');
            localStorage.removeItem('last_auto_backup');
            console.log('🗑️ تم مسح جميع البيانات');
            return true;
        }
        return false;
    }
};

// تهيئة النظام عند تحميل الصفحة
if (typeof window !== 'undefined') {
    window.CardStorage = CardStorage;
    
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => CardStorage.init(), 100);
    });
}

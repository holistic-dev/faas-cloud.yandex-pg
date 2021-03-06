# Holistic.dev cloud function for Yandex.Cloud integration

Функция предназначена для регулярной автоматической отправки актуального состояния представления pg_stat_statements указанной базы PostgreSQL в сервис holistic.dev для дальнейшего анализа.

Функция может быть использована для интеграции как managed PostgreSQL, так и для on-premise экземпляров PostgreSQL.

После окончания процесса настройки вы сможете увидеть все DML-запросы в соответствующем разделе клиентского кабинета.

# Общая информация о функции
Функция разработана для использования в окружении Yandex.Cloud в среде выполнения nodejs12.
Функция выполняет запрос в базу данных, параметры подключения к которой будут переданы в переменной окружения. Для подключения требуется сертификат, предоставляемый Yandex.Cloud, который поставляется вместе с функцией.
Функция выбирает исходный код и метрики всех записей из pg_stat_statements и отправляет на API holistic.dev

# Начало работы
- зарегистрируйтесь в [личном кабинете](https://app.holistic.dev/)
- создайте новый проект
- загрузите [DDL проекта](https://docs.holistic.dev/#database-schema-ddl)
- из аккаунта настроек скопируйте API-key

# Network availability
Экземпляр базы данных должен быть доступен для подключения из функции.
Для managed PostgreSQL при создании кластера необходимо установить параметр **"Публичный доступ"** в значение **"да"** для хоста, который будет источником данных для анализа.


# Pg_stat_statements extension
### Managed PostgreSQL
В кластере PostgreSQL для выбранной базы данных в пункте **"настроить расширения PostgreSQL"** выбрать **"pg_stat_statements"**.

### On-premise PostgreSQL
Для активации расширения выполните команду в базе, для которой производится интеграция

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### Настройка расширения
pg_stat_statements имеет несколько настроек, с которыми можно ознакомиться в [документации к расширению](https://www.postgresql.org/docs/current/pgstatstatements.html#id-1.11.7.38.8)

# Установка
### Создание функции
- скачайте [архив из данного репозитория](https://github.com/holistic-dev/faas-cloud.yandex-pg/blob/master/faas-cloud.yandex-pg.zip) с исходным кодом функции
- в разделе **Cloud Functions** создайте новую функцию
- в созданной функции в разделе **"Редактор"** укажите среду выполнения **nodejs12**
- cпособ - **ZIP-архив**, выберете скаченный архив с исходным кодом функции
- точка входа - **index.handler**
- укажите переменные окружения:
  - **HOLISTICDEV_API_KEY** - API-key из настроек в личном кабинете
  - **HOLISTICDEV_PROJECT_NAME** - имя вашего проекта
  - **PG_CONNECTION_STRING** - строка подключения из настроек кластера managed PostgreSQL или on-premise экземпляра в формате ```postgres://<user>:<password>@<host>:<port>/<dbname>```. Внимание! В строке подключения не нужно указывать параметр ```?ssl=true```
- Создайте сервисный аккаунт
- Нажмите **"Создать версию"**

### Тестирование функции 
- в разделе "Тестирование" нажмите "Запустить тест"
- в разделе "Логи" через несколько секунд появятся данные. Если все параметры функции указаны верно, в логах вы увидите 4 строки - ```START, END, REPORT``` и сериализованный объект вида ```
{ status: 'OK', data: { pgss: { income: 100, new: 100 } } }```

### Настройка триггера
- в разделе **Cloud Functions** создайте новый триггер с типом **"Таймер"**
- в параметре **Cron-выражение** укажите ```0/15 * ? * * *```. Это значение позволит запускать отправку каждые 15 минут. Не рекомендуется устанавливать данное значение для излишне частого срабатывания, т.к. история хранения метрик pg_stat_statements в сервисе holistic.dev  имеет конечную глубину.
- Укажите сервисный аккаунт, который был выбран при создании функции
- Нажмите **"Создать триггер"**
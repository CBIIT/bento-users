class DatabaseDriver {
    constructor(driver) {
        this.driver = driver;
    }

    async executeQuery(parameters, cypher, returnLabel) {
        const session = this.driver.session();
        const tx = session.beginTransaction();
        try {
            const result = await tx.run(cypher, parameters);
            return result.records.map(record => {
                return record.get(returnLabel)
            })
        } catch (error) {
            throw error;
        } finally {
            try {
                await tx.commit();
            } catch (err) {
            }
            await session.close();
        }
    }
}

module.exports = {
    DatabaseDriver
};
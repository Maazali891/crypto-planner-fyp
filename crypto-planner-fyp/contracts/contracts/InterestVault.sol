// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InterestVault
 * @notice A simulated vault for accruing 7% APY on crypto deposits
 * @dev Educational smart contract for FYP demonstration on local Hardhat network
 *      Uses simplified interest calculation suitable for demonstration purposes.
 *      For production, consider using ABDKMath64x64 for precise fixed-point arithmetic.
 */
contract InterestVault {

    // ─── Structs ───────────────────────────────────────────

    struct Deposit {
        uint256 principal;        // Original deposit amount
        uint256 balance;            // Current balance including accrued interest
        uint256 lastUpdateTime;     // Timestamp of last interest accrual
        uint8 assetType;            // 0 = BTC, 1 = ETH
        bool active;                // Whether deposit is still active
    }

    // ─── State Variables ─────────────────────────────────

    // User address => array of deposits
    mapping(address => Deposit[]) public userDeposits;

    // Annual interest rate in basis points (700 = 7%)
    uint256 public constant ANNUAL_RATE_BPS = 700;

    // Seconds in a year (365 days)
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    // Asset type constants
    uint8 public constant ASSET_BTC = 0;
    uint8 public constant ASSET_ETH = 1;

    // ─── Events ────────────────────────────────────────────

    event Deposited(
        address indexed user, 
        uint256 indexed depositId, 
        uint256 amount, 
        uint8 assetType
    );

    event InterestAccrued(
        address indexed user, 
        uint256 indexed depositId, 
        uint256 interestAmount,
        uint256 newBalance
    );

    event Withdrawn(
        address indexed user, 
        uint256 indexed depositId, 
        uint256 amount
    );

    // ─── Modifiers ───────────────────────────────────────

    modifier validDeposit(address user, uint256 depositId) {
        require(depositId < userDeposits[user].length, "Invalid deposit ID");
        _;
    }

    // ─── Core Functions ──────────────────────────────────

    /**
     * @notice Create a new deposit
     * @param amount The deposit amount (in smallest unit)
     * @param assetType 0 for BTC, 1 for ETH
     */
    function deposit(uint256 amount, uint8 assetType) external {
        require(amount > 0, "Amount must be greater than 0");
        require(assetType == ASSET_BTC || assetType == ASSET_ETH, "Invalid asset type");

        uint256 depositId = userDeposits[msg.sender].length;

        userDeposits[msg.sender].push(Deposit({
            principal: amount,
            balance: amount,
            lastUpdateTime: block.timestamp,
            assetType: assetType,
            active: true
        }));

        emit Deposited(msg.sender, depositId, amount, assetType);
    }

    /**
     * @notice Calculate accrued interest using compound formula
     * @dev Uses linear approximation: interest = principal * rate * time / (10000 * SECONDS_PER_YEAR)
     *      For more precision, use: A = P * (1 + r/n)^(nt)
     *      This simplified version is suitable for educational demonstration
     * 
     * @param principal Current balance
     * @param rateBPS Annual rate in basis points
     * @param timeElapsed Seconds since last accrual
     */
    function calculateInterest(
        uint256 principal,
        uint256 rateBPS,
        uint256 timeElapsed
    ) public pure returns (uint256) {
        // Prevent overflow: interest = principal * rateBPS * timeElapsed / (10000 * SECONDS_PER_YEAR)
        // Using intermediate division to prevent overflow in multiplication
        uint256 ratePerSecond = (rateBPS * 1e18) / (10000 * SECONDS_PER_YEAR);
        uint256 growth = (ratePerSecond * timeElapsed) / 1e18;
        return (principal * (1e18 + growth)) / 1e18;
    }

    /**
     * @notice Accrue interest on a specific deposit
     * @param user Address of deposit owner
     * @param depositId Index of the deposit
     */
    function accrueInterest(address user, uint256 depositId) 
        external 
        validDeposit(user, depositId) 
    {
        Deposit storage dep = userDeposits[user][depositId];
        require(dep.active, "Deposit not active");

        uint256 timeElapsed = block.timestamp - dep.lastUpdateTime;
        require(timeElapsed > 0, "No time elapsed since last accrual");

        uint256 newBalance = calculateInterest(dep.balance, ANNUAL_RATE_BPS, timeElapsed);
        uint256 interest = newBalance - dep.balance;

        dep.balance = newBalance;
        dep.lastUpdateTime = block.timestamp;

        emit InterestAccrued(user, depositId, interest, newBalance);
    }

    /**
     * @notice Withdraw a deposit (closes it)
     * @param depositId Index of the deposit to withdraw
     */
    function withdraw(uint256 depositId) external validDeposit(msg.sender, depositId) {
        Deposit storage dep = userDeposits[msg.sender][depositId];
        require(dep.active, "Deposit already withdrawn");

        // Accrue final interest before withdrawal
        uint256 timeElapsed = block.timestamp - dep.lastUpdateTime;
        if (timeElapsed > 0) {
            uint256 newBalance = calculateInterest(dep.balance, ANNUAL_RATE_BPS, timeElapsed);
            dep.balance = newBalance;
        }

        uint256 amount = dep.balance;
        dep.active = false;
        dep.balance = 0;

        emit Withdrawn(msg.sender, depositId, amount);
    }

    // ─── View Functions ──────────────────────────────────

    /**
     * @notice Get deposit details
     */
    function getDeposit(address user, uint256 depositId) 
        external 
        view 
        validDeposit(user, depositId) 
        returns (Deposit memory) 
    {
        return userDeposits[user][depositId];
    }

    /**
     * @notice Get all deposits for a user
     */
    function getAllDeposits(address user) external view returns (Deposit[] memory) {
        return userDeposits[user];
    }

    /**
     * @notice Get number of deposits for a user
     */
    function getDepositCount(address user) external view returns (uint256) {
        return userDeposits[user].length;
    }

    /**
     * @notice Calculate projected balance at a future time
     * @param principal Starting amount
     * @param years Number of years to project
     */
    function calculateProjection(
        uint256 principal,
        uint256 years
    ) external pure returns (uint256) {
        uint256 timeElapsed = years * SECONDS_PER_YEAR;
        return calculateInterest(principal, ANNUAL_RATE_BPS, timeElapsed);
    }
}

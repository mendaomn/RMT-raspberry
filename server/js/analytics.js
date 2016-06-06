var fs = require( "fs" );
var jsonfile = require( "jsonfile" );

var LOCAL_STORAGE_PATH = __dirname + "/../storage/";

exports.getStats = function() {

  var invoices;
  var dates, minDate, maxDate;
  var income;

  invoices = readLocally();
  dates = invoices.map( obj => obj.date );

  minDate = getMinDate( dates );
  maxDate = getMaxDate( dates );
  income = computeTotalIncome( invoices );

  // Per month
  var perMonthInvoices = {};
  invoices.forEach(function( invoice ) {
    var month = new Date( invoice.date ).getMonth();
    if ( !perMonthInvoices[ month ] ) {
      perMonthInvoices[ month ] = [];
    }
    perMonthInvoices[ month ].push( invoice );
  });

  // Per month: total income, orders count, orders' average income
  var perMonth = getStats( perMonthInvoices );

  // Per weekday
  var perWeekDayInvoices = {};
  var uniqueWeekDays = {};
  var uniqueDates = [];

  invoices.forEach(function( invoice ) {
    var day = new Date( invoice.date ).getDay();
    if ( !perWeekDayInvoices[ day ] ) {
      perWeekDayInvoices[ day ] = [];
    }
    perWeekDayInvoices[ day ].push( invoice );

    var date = new Date( invoice.date );
    uniqueDates.push( date.toLocaleDateString() );
  });
  uniqueDates = unique( uniqueDates );
  uniqueDates.forEach(function( dateString ) {
    var dow = new Date( dateString ).getDay();
    uniqueWeekDays[ dow ] ? uniqueWeekDays[ dow ] += 1 : uniqueWeekDays[ dow ] = 1;
  });

  // Per weekday: total income, orders count, orders' average income
  var perWeekDay = getAvgStats( perWeekDayInvoices, uniqueWeekDays );

  var mostSold = computeFrequencies( invoices );

  // Last incomes

  var pastDays = {
    oggi: 0,
    ieri: 0
  };

  var today = new Date( maxDate ).toLocaleDateString();
  var yesterday = new Date();
  yesterday.setTime( maxDate.getTime() - 24 * 60 * 60 * 1000 );
  yesterday = yesterday.toLocaleDateString();

  invoices.forEach(function( invoice ) {
    var date = new Date( invoice.date ).toLocaleDateString();

    if ( date == today ) {
      pastDays.oggi += invoice.total;
    }

    if ( date == yesterday ) {
      pastDays.ieri += invoice.total;
    }
  });

  console.log( pastDays );

  return {
    totals: {
      income: income,
      ordersAvg: income / invoices.length,
      ordersCount: invoices.length
    },
    months: perMonth,
    days: perWeekDay,
    mostSold: mostSold,
    pastDays: pastDays
  };

};

function computeTotalIncome( invoices ) {
  // Compute total income
  return invoices.reduce(function( income, obj ) {
    return income + obj.total;
  }, 0 );
}

function getAvgStats( invoices, counts ) {
  var income = {};
  var ordersCount = {};
  var ordersAvg = {};

  Object.getOwnPropertyNames( invoices ).forEach(function( index ) {
    income[ index ] = computeTotalIncome( invoices[ index ] ) / counts[ index ];
    ordersCount[ index ] = invoices[ index ].length / counts[ index ];
    ordersAvg[ index ] = income[ index ] / ordersCount[ index ];
    // itemFrequencies[ index ] = computeFrequencies( invoices[ index ] );
  });

  return {
    "income": income,
    "ordersCount": ordersCount,
    "ordersAvg": ordersAvg
  };
}

function getStats( invoices ) {
  var income = {};
  var ordersCount = {};
  var ordersAvg = {};
  // var itemFrequencies = {};

  Object.getOwnPropertyNames( invoices ).forEach(function( index ) {

    income[ index ] = computeTotalIncome( invoices[ index ] );
    ordersCount[ index ] = invoices[ index ].length;
    ordersAvg[ index ] = income[ index ] / ordersCount[ index ];
    // itemFrequencies[ index ] = computeFrequencies( invoices[ index ] );
  });

  return {
    "income": income,
    "ordersCount": ordersCount,
    "ordersAvg": ordersAvg
      // "frequencies": itemFrequencies
  };
}

function computeFrequencies( invoices ) {
  var frequencies = {};
  var orders = invoices.map( invoice => invoice.order );
  orders.forEach( order => {
    order.forEach( item => {
      if ( !frequencies[ item.food.name ] ) {
        frequencies[ item.food.name ] = 0;
      }
      frequencies[ item.food.name ] += item.quantity;
    });
  });

  var orderedFrequencies = [];
  Object.getOwnPropertyNames( frequencies ).forEach(function( name ) {
    orderedFrequencies.push({
      name: name,
      count: frequencies[ name ]
    });
  });

  orderedFrequencies.sort(function( a, b ) {
    return a.count - b.count;
  }).reverse();

  return orderedFrequencies;
}

function getMinDate( dates ) {
  var minDate = new Date();
  dates.forEach(function( date ) {

    var d = new Date( date );

    if ( d < minDate ) {
      minDate = d;
    }
  });

  return minDate;
}

function getMaxDate( dates ) {
  var maxDate = new Date( 0 );

  dates.forEach(function( date ) {
    var d = new Date( date );

    if ( d > maxDate ) {
      maxDate = d;
    }
  });

  return maxDate;
}

// UTILITY: does invoice belong to today's work session?
function isTodaysInvoice( invoice ) {
  // Today
  var today = new Date(),
    todayHours = today.getHours(),
    todayDateString = today.toDateString();

  // Invoice
  var invoiceDate = new Date( invoice.date ),
    invoiceHours = invoiceDate.getHours(),
    invoiceDateString = invoiceDate.toDateString();

  if ( invoiceDateString === todayDateString ) {
    return ( todayHours < 5 ) && ( invoiceHours < 5 ) ||
      ( todayHours >= 5 ) && ( invoiceHours >= 5 );
  } else if ( invoiceDate.getYear() === today.getYear() &&
    invoiceDate.getMonth() === today.getMonth() ) {
    return ( todayHours < 5 ) && ( invoiceHours >= 5 ) &&
      ( today.getDay() === invoiceDate.getDay() - 1 );
  }
}

function readLocally() {
  return fs.readdirSync( LOCAL_STORAGE_PATH )
    .map(function( filename ) {
      var filepath,
        obj;

      filepath = LOCAL_STORAGE_PATH + filename;
      obj = jsonfile.readFileSync( filepath, {
        throws: false
      });

      return obj;
    });
}

function unique( array ) {
  var dict = [];
  array.forEach(function( item ) {
    if ( dict.indexOf( item ) == -1 ) {
      dict.push( item );
    }
  });
  return dict;
}
